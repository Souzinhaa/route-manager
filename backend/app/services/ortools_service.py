from ortools.linear_solver import pywraplp
from typing import List, Tuple, Dict
import math


class OrToolsService:
    @staticmethod
    def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Distance between two points in km"""
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
        """Solve TSP using OR-Tools"""
        # Create distance matrix
        locations = [start_coords] + [(w.get("latitude"), w.get("longitude")) for w in waypoints] + [end_coords]
        n = len(locations)

        distance_matrix = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i != j:
                    distance_matrix[i][j] = OrToolsService.haversine(
                        locations[i][0], locations[i][1],
                        locations[j][0], locations[j][1]
                    )

        # Solve
        solver = pywraplp.Solver.CreateSolver("SCIP")
        if not solver:
            return list(range(1, len(waypoints) + 1)), 0

        # Simple greedy for low-resource: start at 0, always go to nearest unvisited
        visited = [False] * n
        visited[0] = True
        route = [0]
        total_distance = 0
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

        # Convert to waypoint indices
        optimized_indices = [i - 1 for i in route[1:-1]]
        return optimized_indices, total_distance

    @staticmethod
    def estimate_cost(distance_km: float, vehicle_type: str = "van") -> float:
        """Simple cost estimate"""
        cost_per_km = {
            "car": 0.5,
            "van": 0.8,
            "truck": 1.2
        }
        return distance_km * cost_per_km.get(vehicle_type, 0.8)
