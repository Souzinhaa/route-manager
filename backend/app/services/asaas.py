import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_SANDBOX_URL = "https://sandbox.asaas.com/api/v3"
_PROD_URL = "https://api.asaas.com/v3"

PLAN_LIMITS = {
    "tester":     {"routes_per_day": 1,  "max_waypoints": 50,   "price": 0.0,   "name": "Tester"},
    "basic":      {"routes_per_day": 1,  "max_waypoints": 100,  "price": 39.0,  "name": "Basic"},
    "starter":    {"routes_per_day": 3,  "max_waypoints": 100,  "price": 89.0,  "name": "Starter"},
    "delivery":   {"routes_per_day": 5,  "max_waypoints": 150,  "price": 149.0, "name": "Delivery"},
    "premium":    {"routes_per_day": 10, "max_waypoints": 200,  "price": 299.0, "name": "Premium"},
    "enterprise": {"routes_per_day": -1, "max_waypoints": -1,   "price": 0.0,   "name": "Enterprise"},
}


class AsaasService:
    def __init__(self, api_key: str, sandbox: bool = True):
        self.base_url = _SANDBOX_URL if sandbox else _PROD_URL
        self._headers = {
            "access_token": api_key,
            "Content-Type": "application/json",
        }

    def _get(self, path: str) -> dict:
        with httpx.Client(timeout=30) as client:
            r = client.get(f"{self.base_url}{path}", headers=self._headers)
            r.raise_for_status()
            return r.json()

    def _post(self, path: str, data: dict) -> dict:
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{self.base_url}{path}", json=data, headers=self._headers)
            r.raise_for_status()
            return r.json()

    def _delete(self, path: str) -> dict:
        with httpx.Client(timeout=30) as client:
            r = client.delete(f"{self.base_url}{path}", headers=self._headers)
            r.raise_for_status()
            return r.json()

    def create_customer(self, name: str, email: str, cpf_cnpj: Optional[str] = None) -> dict:
        data: dict = {"name": name, "email": email}
        if cpf_cnpj:
            data["cpfCnpj"] = cpf_cnpj
        return self._post("/customers", data)

    def create_subscription(
        self,
        customer_id: str,
        billing_type: str,
        value: float,
        next_due_date: str,
        description: str,
    ) -> dict:
        return self._post("/subscriptions", {
            "customer": customer_id,
            "billingType": billing_type,
            "value": value,
            "nextDueDate": next_due_date,
            "cycle": "MONTHLY",
            "description": description,
        })

    def get_subscription(self, subscription_id: str) -> dict:
        return self._get(f"/subscriptions/{subscription_id}")

    def cancel_subscription(self, subscription_id: str) -> dict:
        return self._delete(f"/subscriptions/{subscription_id}")

    def get_pending_payment_url(self, subscription_id: str) -> Optional[str]:
        try:
            data = self._get(f"/payments?subscription={subscription_id}&status=PENDING")
            payments = data.get("data", [])
            if payments:
                return payments[0].get("invoiceUrl") or payments[0].get("bankSlipUrl")
        except Exception as exc:
            logger.warning("Could not fetch payment URL for %s: %s", subscription_id, exc)
        return None
