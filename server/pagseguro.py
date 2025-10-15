import os
import time
import requests


class PagSeguroClient:
    """
    Minimal PagSeguro (PagBank) client for PIX payments.

    Uses Orders + Charges flow when a valid token is present.
    Falls back to a local mock mode when ENV or token is missing so the
    frontend can be exercised without hitting the real API.
    """

    def __init__(self, token: str | None = None, env: str = "sandbox"):
        self.token = token
        self.env = (env or "sandbox").lower()
        self.base_url = (
            "https://sandbox.api.pagseguro.com" if self.env == "sandbox" else "https://api.pagseguro.com"
        )

    @property
    def is_mock(self) -> bool:
        return not self.token

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    # --- Public API ---
    def create_pix_charge(self, reference_id: str, description: str, amount_cents: int, customer_email: str,
                           notification_url: str | None = None):
        """
        Create a PIX charge. If token is missing, return a mock charge structure.
        """
        if self.is_mock:
            # Simple mock structure with a fake QR code text
            fake_code = (
                "00020101021226740014BR.GOV.BCB.PIX2553pix.example/qr/" + reference_id +
                "5204000053039865405" + str(amount_cents / 100).replace(".", "") +
                "5802BR5920Olha o Replay Ltda6009SaoPaulo62070503***6304ABCD"
            )
            return {
                "mode": "mock",
                "charge_id": f"mock_{reference_id}",
                "status": "PENDING",
                "amount": {"value": amount_cents, "currency": "BRL"},
                "qr_code": {"text": fake_code, "image": None},
                "expires_at": int(time.time()) + 30 * 60,
            }

        # Real API call: create charge directly (v4)
        payload = {
            "reference_id": reference_id,
            "description": description,
            "amount": {"value": amount_cents, "currency": "BRL"},
            "payment_method": {"type": "PIX"},
        }

        if notification_url:
            payload["notification_urls"] = [notification_url]

        # Optional customer info (helps reconciliation)
        if customer_email:
            payload["customer"] = {"email": customer_email}

        url = f"{self.base_url}/charges"
        resp = requests.post(url, json=payload, headers=self._headers(), timeout=20)
        resp.raise_for_status()
        data = resp.json()

        # Normalize response fields we care about
        qr_text = None
        qr_image = None
        expires_at = None

        # Some responses include qr_codes list with text and image link
        qr_codes = data.get("qr_codes") or []
        if qr_codes:
            first = qr_codes[0]
            qr_text = first.get("text")
            # image link is under links with rel == "QR_CODE_IMAGE"
            links = first.get("links") or []
            for l in links:
                if l.get("rel") == "QR_CODE_IMAGE":
                    qr_image = l.get("href")
            expires_at = first.get("expires_at")

        return {
            "mode": "live",
            "charge_id": data.get("id") or data.get("charge_id"),
            "status": data.get("status") or "PENDING",
            "amount": data.get("amount"),
            "qr_code": {"text": qr_text, "image": qr_image},
            "expires_at": expires_at,
            "raw": data,
        }

    def get_charge(self, charge_id: str):
        if self.is_mock:
            # Mock: alternate between PENDING and PAID based on time
            now = int(time.time())
            return {
                "mode": "mock",
                "id": charge_id,
                "status": "PAID" if now % 2 == 0 else "PENDING",
            }
        url = f"{self.base_url}/charges/{charge_id}"
        resp = requests.get(url, headers=self._headers(), timeout=15)
        resp.raise_for_status()
        return resp.json()


def build_client_from_env():
    token = os.environ.get("PAGSEGURO_TOKEN")
    env = os.environ.get("PAGSEGURO_ENV", "sandbox")
    return PagSeguroClient(token=token, env=env)