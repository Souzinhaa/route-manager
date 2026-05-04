PLANS = {
    "tester": {
        "tier": "trial", "name": "Tester",
        "routes_per_day": 1, "max_stops": 50,
        "price_full": 0, "price_coupon": 0, "price_onboarding": 0,
    },
    "basic": {
        "tier": "consumer", "name": "Basic",
        "routes_per_day": 1, "max_stops": 100,
        "price_full": 49, "price_coupon": 44, "price_onboarding": 39,
    },
    "starter": {
        "tier": "consumer", "name": "Starter",
        "routes_per_day": 3, "max_stops": 100,
        "price_full": 109, "price_coupon": 99, "price_onboarding": 89,
    },
    "delivery": {
        "tier": "consumer", "name": "Delivery",
        "routes_per_day": 5, "max_stops": 150,
        "price_full": 179, "price_coupon": 159, "price_onboarding": 149,
    },
    "premium": {
        "tier": "consumer", "name": "Premium",
        "routes_per_day": 10, "max_stops": 200,
        "price_full": 349, "price_coupon": 319, "price_onboarding": 299,
    },
    "enterprise_medio": {
        "tier": "enterprise", "name": "Enterprise Medio",
        "routes_per_day": 50, "max_stops": 300,
        "price_full": 1200, "price_coupon": 1200, "price_onboarding": 1200,
    },
    "enterprise_avancado": {
        "tier": "enterprise", "name": "Enterprise Avancado",
        "routes_per_day": 100, "max_stops": 400,
        "price_full": 2500, "price_coupon": 2500, "price_onboarding": 2500,
    },
    "enterprise_custom": {
        "tier": "enterprise", "name": "Enterprise Custom",
        "routes_per_day": -1, "max_stops": -1,
        "price_full": 5000, "price_coupon": 5000, "price_onboarding": 5000,
    },
}

COMMISSION_RATE = 0.10


def _norm(plan_key: str) -> str:
    return "enterprise_medio" if plan_key == "enterprise" else plan_key


def get_plan(plan_key: str) -> dict:
    return PLANS[_norm(plan_key)]


def plan_limits(plan_key: str) -> dict:
    p = get_plan(plan_key)
    return {
        "routes_per_day": p["routes_per_day"],
        "max_waypoints": p["max_stops"],
        "name": p["name"],
    }


def resolve_price(plan_key: str, is_onboarding: bool, has_coupon: bool) -> float:
    p = get_plan(plan_key)
    if p["tier"] == "enterprise":
        return float(p["price_full"])
    if is_onboarding:
        return float(p["price_onboarding"])
    if has_coupon:
        return float(p["price_coupon"])
    return float(p["price_full"])


def commission_for(plan_key: str) -> float:
    return float(get_plan(plan_key)["price_full"]) * COMMISSION_RATE
