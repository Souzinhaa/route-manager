import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_SANDBOX_URL = "https://sandbox.asaas.com/api/v3"
_PROD_URL = "https://api.asaas.com/v3"

def _build_compat_limits():
    from app.services import pricing
    result = {}
    for k, v in pricing.PLANS.items():
        result[k] = {"routes_per_day": v["routes_per_day"], "max_waypoints": v["max_stops"], "price": float(v["price_full"]), "name": v["name"]}
    return result

PLAN_LIMITS = _build_compat_limits()


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

    @staticmethod
    def _extract_error(exc: Exception) -> str:
        try:
            body = exc.response.json()  # type: ignore[attr-defined]
            errors = body.get("errors") or []
            if errors:
                return errors[0].get("description") or str(exc)
        except Exception:
            pass
        return str(exc)

    def _post(self, path: str, data: dict) -> dict:
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{self.base_url}{path}", json=data, headers=self._headers)
            try:
                r.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise ValueError(self._extract_error(exc)) from exc
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

    def update_subscription(self, subscription_id: str, value: float) -> dict:
        return self._post(f"/subscriptions/{subscription_id}", {"value": value})
