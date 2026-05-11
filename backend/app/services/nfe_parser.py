import logging
import os
import re
import time
from pathlib import Path
from typing import List, Dict, Optional, Tuple

import requests
import pytesseract
from defusedxml import ElementTree as DefusedET
from pdf2image import convert_from_path
from PIL import Image

logger = logging.getLogger(__name__)

NS = {"nfe": "http://www.portalfiscal.inf.br/nfe"}
_CEP_RE = re.compile(r"\d{5}-?\d{3}")

# Cache value: (formatted_address_or_None, expiry_epoch).
# Successful lookups cached 90 days (CEPs rarely change).
# Failed/invalid lookups cached 1 hour (allows retry once user fixes the input or transient errors clear).
_viacep_cache: Dict[str, Tuple[Optional[str], float]] = {}
_VIACEP_CACHE_MAX = 4096
_VIACEP_TTL_SUCCESS = 90 * 24 * 3600
_VIACEP_TTL_FAILURE = 3600


def _lookup_cep(cep: str, number: str = "") -> Optional[str]:
    """Query ViaCEP and return formatted address string, or None on failure.

    Caches both hits and misses (different TTLs) to minimize repeated calls
    against ViaCEP's soft rate limit (~300 req/min/IP).
    """
    digits = re.sub(r"\D", "", cep)
    if len(digits) != 8:
        return None

    cache_key = f"{digits}|{number}"
    now = time.time()
    cached = _viacep_cache.get(cache_key)
    if cached:
        result, expiry = cached
        if expiry > now:
            return result
        del _viacep_cache[cache_key]

    try:
        resp = requests.get(f"https://viacep.com.br/ws/{digits}/json/", timeout=5)
        if resp.status_code != 200:
            # Don't cache transient errors (5xx, network) — let retry happen.
            return None
        data = resp.json()
        if data.get("erro"):
            _store_in_cache(cache_key, None, now + _VIACEP_TTL_FAILURE)
            return None
        parts = [
            data.get("logradouro", ""),
            number,
            data.get("bairro", ""),
            f"{data.get('localidade', '')} - {data.get('uf', '')}".strip(" -"),
        ]
        result = ", ".join(p for p in parts if p).strip()
    except Exception as exc:
        logger.warning("ViaCEP lookup failed for %s: %s", cep, exc)
        return None

    _store_in_cache(cache_key, result, now + _VIACEP_TTL_SUCCESS)
    return result


def _store_in_cache(key: str, value: Optional[str], expiry: float) -> None:
    if len(_viacep_cache) >= _VIACEP_CACHE_MAX:
        evict = list(_viacep_cache.keys())[: _VIACEP_CACHE_MAX // 4]
        for k in evict:
            del _viacep_cache[k]
    _viacep_cache[key] = (value, expiry)


def _xml_text(element, path: str) -> str:
    if element is None:
        return ""
    found = element.find(path, NS)
    if found is None:
        local_path = "/".join(seg.split(":")[-1] for seg in path.split("/"))
        for child in element.iter():
            if child.tag.split("}")[-1] == local_path.split("/")[-1]:
                return (child.text or "").strip()
        return ""
    return (found.text or "").strip()


def _format_address(parent) -> str:
    cep = _xml_text(parent, "nfe:CEP")
    nro = _xml_text(parent, "nfe:nro")
    # Prefer ViaCEP lookup for accurate, geocodable address; inject nro if present
    if cep:
        via_addr = _lookup_cep(cep, number=nro)
        if via_addr:
            return via_addr

    parts = [
        _xml_text(parent, "nfe:xLgr"),
        _xml_text(parent, "nfe:nro"),
        _xml_text(parent, "nfe:xCpl"),
    ]
    street = " ".join(p for p in parts if p)
    bairro = _xml_text(parent, "nfe:xBairro")
    mun = _xml_text(parent, "nfe:xMun")
    uf = _xml_text(parent, "nfe:UF")

    sections = [s for s in [street, bairro, f"{mun} - {uf}".strip(" -"), cep] if s.strip()]
    return ", ".join(sections).strip()


class NFEParser:
    @staticmethod
    def parse_xml_nfe(file_path: str) -> List[Dict]:
        try:
            tree = DefusedET.parse(file_path)
            root = tree.getroot()
        except Exception as exc:
            logger.error("NFE XML parse failed for %s: %s", file_path, exc)
            return []

        addresses: List[Dict] = []

        # The NFe spec wraps content in nfeProc > NFe > infNFe; some emitters omit nfeProc.
        infNFe = root.find(".//nfe:infNFe", NS)
        if infNFe is None:
            for elem in root.iter():
                if elem.tag.split("}")[-1] == "infNFe":
                    infNFe = elem
                    break
        if infNFe is None:
            logger.info("NFE XML has no infNFe element: %s", file_path)
            return []

        dest = infNFe.find("nfe:dest", NS)
        if dest is not None:
            ender = dest.find("nfe:enderDest", NS)
            if ender is not None:
                addr = _format_address(ender)
                if addr:
                    addresses.append({
                        "address": addr,
                        "type": "destination",
                        "cnpj": _xml_text(dest, "nfe:CNPJ"),
                    })

        emit = infNFe.find("nfe:emit", NS)
        if emit is not None:
            ender = emit.find("nfe:enderEmit", NS)
            if ender is not None:
                addr = _format_address(ender)
                if addr:
                    addresses.append({
                        "address": addr,
                        "type": "origin",
                        "cnpj": _xml_text(emit, "nfe:CNPJ"),
                    })

        return addresses

    @staticmethod
    def parse_pdf_nfe(file_path: str) -> List[Dict]:
        _MAX_PDF_BYTES = 5 * 1024 * 1024  # 5MB — beyond this pdf2image memory spikes
        try:
            if os.path.getsize(file_path) > _MAX_PDF_BYTES:
                logger.warning("PDF too large for OCR, skipping: %s", file_path)
                return []
        except OSError:
            pass

        try:
            # Process only first page for speed; DANFE is single-page
            images = convert_from_path(file_path, first_page=1, last_page=1)
        except Exception as exc:
            logger.error("PDF conversion failed for %s: %s", file_path, exc)
            return []

        text = ""
        try:
            for image in images:
                # Reduce resolution for faster OCR; DANFE text is large enough
                small_image = image.resize((image.width // 2, image.height // 2))
                text += pytesseract.image_to_string(small_image, lang="por+eng")
        except Exception as exc:
            logger.error("OCR failed for %s: %s", file_path, exc)
            return []

        return NFEParser._extract_addresses_from_text(text)

    @staticmethod
    def parse_image_nfe(file_path: str) -> List[Dict]:
        try:
            image = Image.open(file_path)
            # Reduce resolution for faster OCR
            small_image = image.resize((image.width // 2, image.height // 2))
            text = pytesseract.image_to_string(small_image, lang="por+eng")
        except Exception as exc:
            logger.error("Image OCR failed for %s: %s", file_path, exc)
            return []

        return NFEParser._extract_addresses_from_text(text)

    @staticmethod
    def _extract_addresses_from_text(text: str) -> List[Dict]:
        addresses: List[Dict] = []
        seen_ceps: set = set()

        # First pass: find CEPs and look up via ViaCEP
        for match in _CEP_RE.finditer(text):
            cep = match.group()
            digits = re.sub(r"\D", "", cep)
            if digits in seen_ceps:
                continue
            seen_ceps.add(digits)

            # Extract number near CEP (look before/after within 100 chars)
            start = max(0, match.start() - 100)
            end = min(len(text), match.end() + 100)
            context = text[start:end]
            number_match = re.search(r',\s*(\d+)', context)
            number = number_match.group(1) if number_match else ""

            addr = _lookup_cep(digits, number=number)
            if addr:
                addresses.append({"address": addr, "type": "unknown"})
            if len(addresses) >= 10:
                return addresses

        # Second pass: fallback to keyword lines if no CEPs found
        if not addresses:
            for line in text.split("\n"):
                stripped = line.strip()
                if not stripped:
                    continue
                if "Rua" in stripped or "Av." in stripped or "Avenida" in stripped:
                    addresses.append({"address": stripped, "type": "unknown"})
                if len(addresses) >= 10:
                    break

        return addresses

    @staticmethod
    def parse_file(file_path: str) -> List[Dict]:
        path = Path(file_path)
        ext = path.suffix.lower()

        if ext == ".xml":
            return NFEParser.parse_xml_nfe(file_path)
        if ext == ".pdf":
            return NFEParser.parse_pdf_nfe(file_path)
        if ext in {".png", ".jpg", ".jpeg"}:
            return NFEParser.parse_image_nfe(file_path)

        logger.info("Unsupported file extension for NFE parser: %s", ext)
        return []
