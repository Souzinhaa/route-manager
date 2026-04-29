from typing import List, Tuple, Dict
import math


class OrToolsService:
    @staticmethod
    def haversine(lat1, lng1, lat2, lng2) -> float:
        if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
            return 0.0
        R = 6371
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)

        a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        return R * c

    @staticmethod
    def optimize_tsp(
        waypoints: List[Dict],
        start_coords: Tuple[float, float],
        end_coords: Tuple[float, float]
    ) -> Tuple[List[int], float]:
        n_waypoints = len(waypoints)
        if n_waypoints == 0:
            d = OrToolsService.haversine(start_coords[0], start_coords[1], end_coords[0], end_coords[1])
            return [], d

        has_coords = all(
            w.get("latitude") is not None and w.get("longitude") is not None
            for w in waypoints
        ) and all(c is not None and c != 0 for c in start_coords + end_coords)

        if not has_coords:
            return list(range(n_waypoints)), 0.0

        locations = [start_coords] + [(w["latitude"], w["longitude"]) for w in waypoints] + [end_coords]
        n = len(locations)

        distance_matrix = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i != j:
                    distance_matrix[i][j] = OrToolsService.haversine(
                        locations[i][0], locations[i][1],
                        locations[j][0], locations[j][1]
                    )

        visited = [False] * n
        visited[0] = True
        route = [0]
        total_distance = 0.0
        current = 0

        for _ in range(n - 2):
            nearest = -1
            nearest_dist = float('inf')
            for j in range(1, n - 1):
                if not visited[j] and distance_matrix[current][j] < nearest_dist:
                    nearest = j
                    nearest_dist = distance_matrix[current][j]

            if nearest != -1:
                route.append(nearest)
                visited[nearest] = True
                total_distance += nearest_dist
                current = nearest

        route.append(n - 1)
        total_distance += distance_matrix[current][n - 1]

        optimized_indices = [i - 1 for i in route[1:-1]]
        return optimized_indices, total_distance

    @staticmethod
    def estimate_cost(distance_km: float, vehicle_type: str = "van") -> float:
        cost_per_km = {
            "car": 0.5,
            "van": 0.8,
            "truck": 1.2
        }
        return distance_km * cost_per_km.get(vehicle_type, 0.8)
