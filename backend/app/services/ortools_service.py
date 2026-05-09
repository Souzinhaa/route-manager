import logging
import math
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


class OrToolsService:
    @staticmethod
    def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
            return 0.0
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
        return R * 2 * math.asin(math.sqrt(a))

    @staticmethod
    def _nearest_neighbor(distance_matrix: List[List[int]], n: int) -> Tuple[List[int], int]:
        """Fallback: greedy nearest-neighbor from node 0 to node n-1."""
        visited = [False] * n
        visited[0] = True
        route = [0]
        total = 0
        current = 0
        for _ in range(n - 2):
            best, best_d = -1, 10 ** 18
            for j in range(1, n - 1):
                if not visited[j] and distance_matrix[current][j] < best_d:
                    best, best_d = j, distance_matrix[current][j]
            if best != -1:
                route.append(best)
                visited[best] = True
                total += best_d
                current = best
        route.append(n - 1)
        total += distance_matrix[current][n - 1]
        return route, total

    @staticmethod
    def optimize_tsp(
        waypoints: List[Dict],
        start_coords: Tuple[float, float],
        end_coords: Tuple[float, float],
    ) -> Tuple[List[int], float]:
        n_wp = len(waypoints)
        if n_wp == 0:
            d = OrToolsService.haversine(start_coords[0], start_coords[1], end_coords[0], end_coords[1])
            return [], d

        has_coords = (
            all(w.get("latitude") is not None and w.get("longitude") is not None for w in waypoints)
            and all(c is not None and c != 0 for c in start_coords + end_coords)
        )
        if not has_coords:
            return list(range(n_wp)), 0.0

        locations = [start_coords] + [(w["latitude"], w["longitude"]) for w in waypoints] + [end_coords]
        n = len(locations)  # n_wp + 2

        # Distance matrix in metres (integers, as OR-Tools requires integers)
        dm: List[List[int]] = [
            [int(OrToolsService.haversine(locations[i][0], locations[i][1], locations[j][0], locations[j][1]) * 1000) for j in range(n)]
            for i in range(n)
        ]

        try:
            from ortools.constraint_solver import pywrapcp, routing_enums_pb2

            # Open route: start=0, end=n-1, 1 vehicle
            manager = pywrapcp.RoutingIndexManager(n, 1, [0], [n - 1])
            routing = pywrapcp.RoutingModel(manager)

            def _dist(from_idx, to_idx):
                return dm[manager.IndexToNode(from_idx)][manager.IndexToNode(to_idx)]

            cb = routing.RegisterTransitCallback(_dist)
            routing.SetArcCostEvaluatorOfAllVehicles(cb)

            params = pywrapcp.DefaultRoutingSearchParameters()
            params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
            params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
            params.time_limit.seconds = 5

            solution = routing.SolveWithParameters(params)

            if solution:
                idx = routing.Start(0)
                route_nodes = []
                while not routing.IsEnd(idx):
                    route_nodes.append(manager.IndexToNode(idx))
                    idx = solution.Value(routing.NextVar(idx))
                route_nodes.append(manager.IndexToNode(idx))
                # route_nodes: [0, wp_indices..., n-1]
                wp_order = [node - 1 for node in route_nodes[1:-1]]
                total_m = solution.ObjectiveValue()
                return wp_order, total_m / 1000.0

            logger.warning("OR-Tools found no solution; falling back to nearest-neighbor")

        except Exception as exc:
            logger.warning("OR-Tools solver unavailable (%s); using nearest-neighbor fallback", exc)

        # Fallback
        route_nodes, total_m = OrToolsService._nearest_neighbor(dm, n)
        wp_order = [node - 1 for node in route_nodes[1:-1]]
        return wp_order, total_m / 1000.0

    _SPEED_KMH = {"moto": 70.0, "leve": 50.0, "pesado": 35.0}
    _COST_PER_KM = {"moto": 0.25, "leve": 0.50, "pesado": 1.20}
    _TOLL_PER_PLAZA = {"moto": 2.50, "leve": 5.00, "pesado": 5.00}

    @staticmethod
    def get_speed_kmh(vehicle_type: str = "leve") -> float:
        return OrToolsService._SPEED_KMH.get(vehicle_type, 50.0)

    @staticmethod
    def estimate_toll(distance_km: float, vehicle_type: str = "leve", axle_count: int = 2) -> float:
        """Estimate toll: ~1 plaza per 50 km. Pesado scales by axle pairs."""
        plazas = int(distance_km // 50)
        if plazas == 0:
            return 0.0
        rate = OrToolsService._TOLL_PER_PLAZA.get(vehicle_type, 5.00)
        if vehicle_type == "pesado":
            return plazas * rate * math.ceil(max(axle_count, 2) / 2)
        return plazas * rate

    @staticmethod
    def estimate_fuel(distance_km: float, fuel_price: float | None, fuel_consumption: float | None) -> float:
        """Real fuel cost when user provides price + consumption (km/L); else 0."""
        if not fuel_price or not fuel_consumption or fuel_consumption <= 0:
            return 0.0
        return (distance_km / fuel_consumption) * fuel_price

    @staticmethod
    def estimate_cost(distance_km: float, vehicle_type: str = "leve") -> float:
        cost = OrToolsService._COST_PER_KM.get(vehicle_type, 0.50)
        return distance_km * cost

    @staticmethod
    def estimate_cost_breakdown(
        distance_km: float,
        vehicle_type: str = "leve",
        fuel_price: float | None = None,
        fuel_consumption: float | None = None,
        axle_count: int = 2,
    ) -> dict:
        """Cost breakdown: fuel, toll, total. Falls back to flat per-km when fuel inputs missing."""
        toll = OrToolsService.estimate_toll(distance_km, vehicle_type, axle_count)
        fuel = OrToolsService.estimate_fuel(distance_km, fuel_price, fuel_consumption)
        if fuel == 0.0:
            fuel = OrToolsService.estimate_cost(distance_km, vehicle_type)
        return {"fuel": round(fuel, 2), "toll": round(toll, 2), "total": round(fuel + toll, 2)}
