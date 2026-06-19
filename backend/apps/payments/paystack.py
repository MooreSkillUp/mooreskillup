"""Paystack API client (stdlib only — no extra dependency).

When PAYSTACK_SECRET_KEY is unset (dev/test), the client runs in *simulation
mode*: it returns a local authorization URL and reports success on verify, so
the full checkout flow works end-to-end without contacting Paystack. Set the
secret key (test or live) to switch to the real API automatically.
"""

import hashlib
import hmac
import json
import logging
import secrets
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)


def is_live():
    # Only a real Paystack secret key ("sk_test_..." / "sk_live_...") counts as
    # live. Anything else (empty, or a placeholder like "paystack_test_secret")
    # falls back to simulation mode so local checkout still works.
    key = getattr(settings, "PAYSTACK_SECRET_KEY", "") or ""
    return key.startswith("sk_")


def _secret():
    return getattr(settings, "PAYSTACK_SECRET_KEY", "")


def _base_url():
    return getattr(settings, "PAYSTACK_BASE_URL", "https://api.paystack.co").rstrip("/")


def new_reference():
    return f"MSU-{secrets.token_hex(8).upper()}"


def _request(method, path, payload=None):
    url = f"{_base_url()}{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {_secret()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            # Paystack sits behind Cloudflare, which 403s the default
            # "Python-urllib" agent. A normal UA gets through.
            "User-Agent": "MooreSkillUp/1.0 (+https://mooreskillup.com)",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:  # 4xx/5xx — Paystack returns JSON
        try:
            body = json.loads(exc.read().decode())
        except Exception:
            body = {"message": str(exc)}
        logger.warning("Paystack %s %s failed: %s", method, path, body)
        return {"status": False, "message": body.get("message", "Paystack request failed."), "data": {}}
    except Exception:  # network/timeout/DNS
        logger.exception("Paystack %s %s error", method, path)
        return {
            "status": False,
            "message": "Could not reach Paystack. Check the server's internet connection and try again.",
            "data": {},
        }


def initialize_transaction(*, email, amount_kobo, reference, callback_url, metadata=None):
    """Returns {authorization_url, reference}."""
    if not is_live():
        # Simulation: bounce the browser straight to our callback so verify runs.
        sep = "&" if "?" in (callback_url or "") else "?"
        return {
            "authorization_url": f"{callback_url}{sep}reference={reference}&simulated=1",
            "reference": reference,
        }

    result = _request(
        "POST",
        "/transaction/initialize",
        {
            "email": email,
            "amount": amount_kobo,
            "reference": reference,
            "callback_url": callback_url,
            "currency": "NGN",
            "metadata": metadata or {},
        },
    )
    data = result.get("data") or {}
    if not result.get("status") or not data.get("authorization_url"):
        raise PaystackError(result.get("message", "Could not start payment."))
    return {"authorization_url": data["authorization_url"], "reference": data.get("reference", reference)}


def verify_transaction(reference):
    """Returns {success: bool, amount_kobo: int, raw: dict}."""
    if not is_live():
        return {"success": True, "amount_kobo": None, "raw": {"simulated": True}}

    result = _request("GET", f"/transaction/verify/{reference}")
    data = result.get("data") or {}
    success = bool(result.get("status")) and data.get("status") == "success"
    return {"success": success, "amount_kobo": data.get("amount"), "raw": data}


def create_refund(reference, amount_kobo=None):
    if not is_live():
        return {"success": True, "raw": {"simulated": True}}
    payload = {"transaction": reference}
    if amount_kobo is not None:
        payload["amount"] = amount_kobo
    result = _request("POST", "/refund", payload)
    return {"success": bool(result.get("status")), "raw": result.get("data") or {}, "message": result.get("message")}


def verify_signature(raw_body: bytes, signature: str) -> bool:
    """Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key."""
    if not signature:
        return False
    if not is_live():
        # In simulation mode we don't receive real webhooks; accept for local testing.
        return True
    computed = hmac.new(_secret().encode(), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(computed, signature)


class PaystackError(Exception):
    pass
