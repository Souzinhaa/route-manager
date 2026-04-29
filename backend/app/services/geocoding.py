import requests
from typing import Tuple, Optional


class GeocodingService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://maps.googleapis.com/maps/api/geocode/json"

    def geocode(self, address: str) -> Optional[Tuple[float, float]]:
        """Convert address to lat/lng"""
        if not self.api_key:
            return None

        try:
            params = {
                "address": address,
                "key": self.api_key
            }
            response = requests.get(self.base_url, params=params, timeout=5)
            response.raise_for_status()

            data = response.json()
            if data.get("results"):
                loc = data["results"][0]["geometry"]["location"]
                return (loc["lat"], loc["lng"])
        except Exception:
            pass

        return None

    def get_distance_matrix(self, origins: list, destinations: list) -> dict:
        """Get distance/duration matrix"""
        if not self.api_key:
            return {}

        try:
            url = "https://maps.googleapis.com/maps/api/distancematrix/json"
            params = {
                "origins": "|".join(origins),
                "destinations": "|".join(destinations),
                "key": self.api_key
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception:
            return {}
