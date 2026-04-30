"""OR-Tools service unit tests (no DB / no HTTP)."""
import math

import pytest

from app.services.ortools_service import OrToolsService


def test_haversine_same_point():
    assert OrToolsService.haversine(0, 0, 0, 0) == 0.0


def test_haversine_known_distance():
    # São Paulo (-23.55, -46.63) → Rio de Janeiro (-22.91, -43.17) ≈ 357 km
    d = OrToolsService.haversine(-23.55, -46.63, -22.91, -43.17)
    assert 340 < d < 380


def test_haversine_none_coords():
    assert OrToolsService.haversine(None, None, None, None) == 0.0


def test_optimize_empty_waypoints():
    start = (-23.55, -46.63)
    end = (-22.91, -43.17)
    indices, dist = OrToolsService.optimize_tsp([], start, end)
    assert indices == []
    assert dist > 0


def test_optimize_single_waypoint():
    start = (-23.55, -46.63)
    wp = [{"address": "A", "latitude": -23.0, "longitude": -46.0}]
    end = (-22.91, -43.17)
    indices, dist = OrToolsService.optimize_tsp(wp, start, end)
    assert indices == [0]
    assert dist > 0


def test_optimize_returns_all_waypoints():
    start = (-23.55, -46.63)
    waypoints = [
        {"address": "A", "latitude": -23.0, "longitude": -46.0},
        {"address": "B", "latitude": -23.1, "longitude": -46.1},
        {"address": "C", "latitude": -23.2, "longitude": -46.2},
    ]
    end = (-22.91, -43.17)
    indices, dist = OrToolsService.optimize_tsp(waypoints, start, end)
    assert sorted(indices) == [0, 1, 2]
    assert dist > 0


def test_optimize_missing_coords_fallback():
    start = (-23.55, -46.63)
    waypoints = [{"address": "A", "latitude": None, "longitude": None}]
    end = (-22.91, -43.17)
    indices, dist = OrToolsService.optimize_tsp(waypoints, start, end)
    # No coords: falls back to sequential order, distance = 0
    assert indices == [0]
    assert dist == 0.0


def test_estimate_cost_van():
    cost = OrToolsService.estimate_cost(100.0, "van")
    assert math.isclose(cost, 80.0)


def test_estimate_cost_unknown_vehicle():
    cost = OrToolsService.estimate_cost(100.0, "bicycle")
    assert math.isclose(cost, 80.0)  # defaults to van rate
