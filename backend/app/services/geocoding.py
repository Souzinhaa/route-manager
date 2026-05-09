import logging
import re
import time
from typing import Tuple, Optional, List, Dict

import requests

logger = logging.getLogger(__name__)

# Module-level cache: normalized_address -> (coords, expiry_epoch)
# Successful geocodes cached 30 days. Failed (None) NOT cached so retries are cheap once address is fixed.
_geocode_cache: Dict[str, Tuple[Tuple[float, float], float]] = {}
_GEOCODE_CACHE_MAX = 8192
_GEOCODE_TTL_SECONDS = 30 * 24 * 3600  # 30 days

# Normalization: strip CEP suffix, country, repeated whitespace/punctuation.
# Goal: maximize cache hit rate across format variations of same address.
_CEP_RE = re.compile(r"\b\d{5}-?\d{3}\b")
_TAIL_BR_RE = re.compile(r",\s*(brasil|brazil|br)\s*$", re.IGNORECASE)
_MULTI_SPACE_RE = re.compile(r"\s+")
_MULTI_COMMA_RE = re.compile(r",\s*,+")


def _cache_key(address: str) -> str:
    s = address.lower().strip()
    s = _CEP_RE.sub("", s)
    s = _TAIL_BR_RE.sub("", s)
    s = _MULTI_COMMA_RE.sub(",", s)
    s = _MULTI_SPACE_RE.sub(" ", s)
    return s.strip(" ,")


class GeocodingService:
    BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def geocode(self, address: str) -> Optional[Tuple[float, float]]:
        if not self.api_key:
            logger.warning("Geocoding skipped: GOOGLE_MAPS_API_KEY is not set")
            return None

        key = _cache_key(address)
        if not key:
            return None

        now = time.time()
        cached = _geocode_cache.get(key)
        if cached:
            coords, expiry = cached
            if expiry > now:
                return coords
            # Expired: drop and refetch
            del _geocode_cache[key]

        try:
            response = requests.get(
                self.BASE_URL,
                params={"address": address, "key": self.api_key, "region": "br"},
                timeout=5,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error("Geocoding request failed for %r: %s", address, exc)
            return None

        try:
            data = response.json()
            results = data.get("results") or []
            if not results:
                logger.info("Geocoding returned no results for %r", address)
                # Don't cache misses: user may correct the address; retry should be cheap.
                return None
            loc = results[0]["geometry"]["location"]
            coords = (loc["lat"], loc["lng"])
        except (KeyError, ValueError) as exc:
            logger.error("Geocoding response malformed for %r: %s", address, exc)
            return None

        if len(_geocode_cache) >= _GEOCODE_CACHE_MAX:
            # Evict oldest quarter (insertion order proxy for LRU)
            evict = list(_geocode_cache.keys())[: _GEOCODE_CACHE_MAX // 4]
            for k in evict:
                del _geocode_cache[k]

        _geocode_cache[key] = (coords, now + _GEOCODE_TTL_SECONDS)
        return coords

    def search(self, query: str) -> List[str]:
        """Search for addresses and return formatted address strings."""
        if not self.api_key:
            logger.warning("Address search skipped: GOOGLE_MAPS_API_KEY is not set")
            return []

        try:
            response = requests.get(
                self.BASE_URL,
                params={
                    "address": query,
                    "key": self.api_key,
                    "region": "br",
                },
                timeout=5,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error("Address search failed for %r: %s", query, exc)
            return []

        try:
            data = response.json()
            results = data.get("results") or []
            return [r.get("formatted_address", "") for r in results if r.get("formatted_address")]
        except (KeyError, ValueError) as exc:
            logger.error("Address search response malformed for %r: %s", query, exc)
            return []

