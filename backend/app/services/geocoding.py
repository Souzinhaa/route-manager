import logging
from typing import Tuple, Optional, List, Dict, Any

import requests

logger = logging.getLogger(__name__)


class GeocodingService:
    BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
    DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def geocode(self, address: str) -> Optional[Tuple[float, float]]:
        if not self.api_key:
            logger.warning("Geocoding skipped: GOOGLE_MAPS_API_KEY is not set")
            return None

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
                return None
            loc = results[0]["geometry"]["location"]
            return (loc["lat"], loc["lng"])
        except (KeyError, ValueError) as exc:
            logger.error("Geocoding response malformed for %r: %s", address, exc)
            return None

    def search(self, query: str) -> List[str]:
        """Search for addresses and return formatted address strings."""
        if not self.api_key:
            logger.warning("Address search skipped: GOOGLE_MAPS_API_KEY is not set")
            return []

        try:
            response = requests.get(
                self.BASE_URL,
                params={"address": query, "key": self.api_key},
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

    def get_distance_matrix(self, origins: List[str], destinations: List[str]) -> Dict[str, Any]:
        if not self.api_key:
            logger.warning("Distance matrix skipped: GOOGLE_MAPS_API_KEY is not set")
            return {}

        try:
            response = requests.get(
                self.DISTANCE_MATRIX_URL,
                params={
                    "origins": "|".join(origins),
                    "destinations": "|".join(destinations),
                    "key": self.api_key,
                },
                timeout=10,
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:
            logger.error("Distance matrix request failed: %s", exc)
            return {}
