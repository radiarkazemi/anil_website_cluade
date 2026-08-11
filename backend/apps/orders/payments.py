"""Iranian payment gateway adapters (Zarinpal, IDPay, …).

Flow:
  1. Customer creates order (status=pending)
  2. POST /api/v1/orders/<order_number>/pay/  { gateway: "zarinpal"|"idpay" }
  3. Backend requests authority from gateway → returns payment_url
  4. Customer pays on gateway
  5. Gateway hits /api/v1/payments/callback/<gateway>/ → verify → mark paid
"""

from __future__ import annotations

import logging
import os
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@dataclass
class PaymentStartResult:
    ok: bool
    payment_url: str = ""
    authority: str = ""
    message: str = ""
    sandbox: bool = True
    raw: dict | None = None


@dataclass
class PaymentVerifyResult:
    ok: bool
    ref_id: str = ""
    message: str = ""
    amount: int = 0
    raw: dict | None = None


class BaseGateway(ABC):
    code: str = "base"
    label: str = "درگاه"

    def __init__(self):
        self.sandbox = getattr(settings, "PAYMENT_SANDBOX", True)
        self.callback_base = getattr(
            settings,
            "PAYMENT_CALLBACK_BASE",
            os.environ.get("PAYMENT_CALLBACK_BASE", "http://localhost:8000"),
        ).rstrip("/")

    def callback_url(self) -> str:
        return f"{self.callback_base}/api/v1/payments/callback/{self.code}/"

    @abstractmethod
    def start(self, order, *, description: str = "") -> PaymentStartResult:
        ...

    @abstractmethod
    def verify(self, order, *, authority: str, amount: int, **kwargs) -> PaymentVerifyResult:
        ...


class ZarinpalGateway(BaseGateway):
    """Zarinpal v4 REST — https://www.zarinpal.com"""

    code = "zarinpal"
    label = "زرین‌پال"

    def __init__(self):
        super().__init__()
        self.merchant_id = os.environ.get("ZARINPAL_MERCHANT_ID", "").strip() or "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

    @property
    def api_base(self) -> str:
        if self.sandbox:
            return "https://sandbox.zarinpal.com/pg/v4/payment"
        return "https://api.zarinpal.com/pg/v4/payment"

    @property
    def start_pay_base(self) -> str:
        if self.sandbox:
            return "https://sandbox.zarinpal.com/pg/StartPay"
        return "https://www.zarinpal.com/pg/StartPay"

    def start(self, order, *, description: str = "") -> PaymentStartResult:
        payload = {
            "merchant_id": self.merchant_id,
            "amount": int(order.total),
            "callback_url": self.callback_url(),
            "description": description or f"سفارش {order.order_number} — گالری آنیل",
            "metadata": {
                "order_id": order.order_number,
                "mobile": order.phone,
                "email": order.email or "",
            },
        }
        if self.sandbox and self.merchant_id.startswith("xxxx"):
            # Offline sandbox stub — no real network call
            authority = f"SANDBOX-{uuid.uuid4().hex[:24].upper()}"
            return PaymentStartResult(
                ok=True,
                authority=authority,
                payment_url=f"{self.start_pay_base}/{authority}",
                sandbox=True,
                message="حالت آزمایشی زرین‌پال (بدون Merchant واقعی)",
                raw={"stub": True},
            )
        try:
            r = requests.post(f"{self.api_base}/request.json", json=payload, timeout=20)
            data = r.json()
            errors = data.get("errors")
            result = (data.get("data") or {})
            if errors and (isinstance(errors, list) and errors or isinstance(errors, dict) and errors):
                msg = str(errors)
                return PaymentStartResult(ok=False, message=msg, raw=data)
            authority = result.get("authority", "")
            if not authority:
                return PaymentStartResult(ok=False, message="authority دریافت نشد", raw=data)
            return PaymentStartResult(
                ok=True,
                authority=authority,
                payment_url=f"{self.start_pay_base}/{authority}",
                sandbox=self.sandbox,
                raw=data,
            )
        except Exception as exc:
            logger.exception("zarinpal start failed")
            return PaymentStartResult(ok=False, message=str(exc))

    def verify(self, order, *, authority: str, amount: int, **kwargs) -> PaymentVerifyResult:
        if authority.startswith("SANDBOX-"):
            ref = f"REF-{uuid.uuid4().hex[:10].upper()}"
            return PaymentVerifyResult(ok=True, ref_id=ref, amount=amount, message="تأیید آزمایشی", raw={"stub": True})
        payload = {
            "merchant_id": self.merchant_id,
            "amount": int(amount),
            "authority": authority,
        }
        try:
            r = requests.post(f"{self.api_base}/verify.json", json=payload, timeout=20)
            data = r.json()
            result = data.get("data") or {}
            code = result.get("code")
            if code in (100, 101):
                return PaymentVerifyResult(
                    ok=True,
                    ref_id=str(result.get("ref_id", "")),
                    amount=amount,
                    message="پرداخت موفق",
                    raw=data,
                )
            return PaymentVerifyResult(ok=False, message=f"کد تأیید: {code}", raw=data)
        except Exception as exc:
            logger.exception("zarinpal verify failed")
            return PaymentVerifyResult(ok=False, message=str(exc))


class IDPayGateway(BaseGateway):
    """IDPay REST — https://idpay.ir"""

    code = "idpay"
    label = "آیدی‌پی"

    def __init__(self):
        super().__init__()
        self.api_key = os.environ.get("IDPAY_API_KEY", "").strip() or "sandbox-api-key"

    @property
    def api_base(self) -> str:
        return "https://api.idpay.ir/v1.1"

    def _headers(self) -> dict:
        return {
            "Content-Type": "application/json",
            "X-API-KEY": self.api_key,
            "X-SANDBOX": "1" if self.sandbox else "0",
        }

    def start(self, order, *, description: str = "") -> PaymentStartResult:
        if self.sandbox and self.api_key == "sandbox-api-key":
            authority = f"ID-{uuid.uuid4().hex[:20].upper()}"
            return PaymentStartResult(
                ok=True,
                authority=authority,
                payment_url=f"https://idpay.ir/p/sandbox/{authority}",
                sandbox=True,
                message="حالت آزمایشی آیدی‌پی",
                raw={"stub": True},
            )
        payload = {
            "order_id": order.order_number,
            "amount": int(order.total),
            "callback": self.callback_url(),
            "desc": description or f"سفارش {order.order_number}",
            "name": order.full_name,
            "phone": order.phone,
            "mail": order.email or "",
        }
        try:
            r = requests.post(f"{self.api_base}/payment", json=payload, headers=self._headers(), timeout=20)
            data = r.json()
            if r.status_code not in (200, 201) or "id" not in data:
                return PaymentStartResult(ok=False, message=str(data), raw=data)
            return PaymentStartResult(
                ok=True,
                authority=str(data["id"]),
                payment_url=data.get("link", ""),
                sandbox=self.sandbox,
                raw=data,
            )
        except Exception as exc:
            logger.exception("idpay start failed")
            return PaymentStartResult(ok=False, message=str(exc))

    def verify(self, order, *, authority: str, amount: int, **kwargs) -> PaymentVerifyResult:
        if authority.startswith("ID-") and self.sandbox:
            ref = f"IDREF-{uuid.uuid4().hex[:8].upper()}"
            return PaymentVerifyResult(ok=True, ref_id=ref, amount=amount, message="تأیید آزمایشی آیدی‌پی", raw={"stub": True})
        payload = {"id": authority, "order_id": order.order_number}
        try:
            r = requests.post(f"{self.api_base}/payment/verify", json=payload, headers=self._headers(), timeout=20)
            data = r.json()
            status = data.get("status")
            if status in (100, 101, "100", "101"):
                return PaymentVerifyResult(
                    ok=True,
                    ref_id=str(data.get("track_id") or data.get("payment", {}).get("track_id", "")),
                    amount=amount,
                    message="پرداخت موفق",
                    raw=data,
                )
            return PaymentVerifyResult(ok=False, message=f"وضعیت: {status}", raw=data)
        except Exception as exc:
            logger.exception("idpay verify failed")
            return PaymentVerifyResult(ok=False, message=str(exc))


GATEWAYS: dict[str, type[BaseGateway]] = {
    "zarinpal": ZarinpalGateway,
    "idpay": IDPayGateway,
}


def get_gateway(code: str) -> BaseGateway:
    cls = GATEWAYS.get(code)
    if not cls:
        raise ValueError(f"درگاه نامعتبر: {code}")
    return cls()


def list_gateways() -> list[dict[str, Any]]:
    return [
        {
            "code": code,
            "label": cls().label,
            "sandbox": getattr(settings, "PAYMENT_SANDBOX", True),
        }
        for code, cls in GATEWAYS.items()
    ]


def mark_order_paid(order, *, gateway: str, authority: str, ref_id: str, raw: dict | None = None):
    order.status = order.Status.PAID
    order.payment_gateway = gateway
    order.payment_authority = authority
    order.payment_ref_id = ref_id
    order.payment_raw = raw or {}
    order.paid_at = timezone.now()
    order.save(
        update_fields=[
            "status",
            "payment_gateway",
            "payment_authority",
            "payment_ref_id",
            "payment_raw",
            "paid_at",
            "updated_at",
        ]
    )
    return order
