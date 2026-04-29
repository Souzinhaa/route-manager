import xmltodict
from pathlib import Path
from typing import List, Dict
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
import json


class NFEParser:
    @staticmethod
    def parse_xml_nfe(file_path: str) -> List[Dict]:
        """Extract addresses from NFE XML"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = xmltodict.parse(f.read())

            addresses = []
            # NFe structure: nfeProc > NFe > infNFe > dest/transp
            nfe_info = data.get("nfeProc", {}).get("NFe", {}).get("infNFe", {})

            # Destination address
            dest = nfe_info.get("dest", {})
            if dest:
                enderDest = dest.get("enderDest", {})
                address = f"{enderDest.get('xLgr', '')} {enderDest.get('nro', '')} {enderDest.get('xCpl', '')}, {enderDest.get('xBairro', '')}, {enderDest.get('xMun', '')} - {enderDest.get('UF', '')} {enderDest.get('CEP', '')}"
                if address.strip():
                    addresses.append({
                        "address": address,
                        "type": "destination",
                        "cnpj": dest.get("CNPJ", "")
                    })

            # Origin address
            emit = nfe_info.get("emit", {})
            if emit:
                enderEmit = emit.get("enderEmit", {})
                address = f"{enderEmit.get('xLgr', '')} {enderEmit.get('nro', '')} {enderEmit.get('xCpl', '')}, {enderEmit.get('xBairro', '')}, {enderEmit.get('xMun', '')} - {enderEmit.get('UF', '')} {enderEmit.get('CEP', '')}"
                if address.strip():
                    addresses.append({
                        "address": address,
                        "type": "origin",
                        "cnpj": emit.get("CNPJ", "")
                    })

            return addresses
        except Exception as e:
            return []

    @staticmethod
    def parse_pdf_nfe(file_path: str) -> List[Dict]:
        """Extract addresses from NFE PDF using OCR"""
        try:
            images = convert_from_path(file_path)
            text = ""
            for image in images[:5]:  # First 5 pages
                text += pytesseract.image_to_string(image)

            # Simple extraction - look for CEP pattern
            addresses = []
            lines = text.split('\n')
            for line in lines:
                if 'CEP' in line or 'Rua' in line or 'Av.' in line:
                    addresses.append({
                        "address": line.strip(),
                        "type": "unknown"
                    })

            return addresses[:10]  # Max 10
        except Exception:
            return []

    @staticmethod
    def parse_image_nfe(file_path: str) -> List[Dict]:
        """Extract addresses from NFE image using OCR"""
        try:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)

            addresses = []
            lines = text.split('\n')
            for line in lines:
                if 'CEP' in line or 'Rua' in line or 'Av.' in line:
                    addresses.append({
                        "address": line.strip(),
                        "type": "unknown"
                    })

            return addresses[:10]
        except Exception:
            return []

    @staticmethod
    def parse_file(file_path: str) -> List[Dict]:
        """Auto-detect and parse file"""
        path = Path(file_path)
        ext = path.suffix.lower()

        if ext == ".xml":
            return NFEParser.parse_xml_nfe(file_path)
        elif ext == ".pdf":
            return NFEParser.parse_pdf_nfe(file_path)
        elif ext in [".png", ".jpg", ".jpeg"]:
            return NFEParser.parse_image_nfe(file_path)

        return []
