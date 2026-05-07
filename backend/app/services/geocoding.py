import logging
from typing import Tuple, Optional, List, Dict

import requests

logger = logging.getLogger(__name__)

# Module-level cache: normalized_address -> (lat, lng) or None
# Survives across requests for the process lifetime. Max 2048 entries (~few MB).
_geocode_cache: Dict[str, Optional[Tuple[float, float]]] = {}
_GEOCODE_CACHE_MAX = 2048


def _cache_key(address: str) -> str:
    return address.lower().strip()


class GeocodingService:
    BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def geocode(self, address: str) -> Optional[Tuple[float, float]]:
        if not self.api_key:
            logger.warning("Geocoding skipped: GOOGLE_MAPS_API_KEY is not set")
            return None

        key = _cache_key(address)
        if key in _geocode_cache:
            return _geocode_cache[key]

        try:
            response = requests.get(
                self.BASE_URL,
                params={"address": address, "key": self.api_key},
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
                _geocode_cache[key] = None
                return None
            loc = results[0]["geometry"]["location"]
            coords = (loc["lat"], loc["lng"])
        except (KeyError, ValueError) as exc:
            logger.error("Geocoding response malformed for %r: %s", address, exc)
            return None

        if len(_geocode_cache) >= _GEOCODE_CACHE_MAX:
            # Evict oldest quarter when full
            evict = list(_geocode_cache.keys())[: _GEOCODE_CACHE_MAX // 4]
            for k in evict:
                del _geocode_cache[k]

        _geocode_cache[key] = coords
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

