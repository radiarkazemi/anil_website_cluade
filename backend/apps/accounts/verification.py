"""Demo-friendly OTP verification for phone (Iran) and email."""

from __future__ import annotations

import logging
import random
import string

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

OTP_TTL_SECONDS = int(getattr(settings, "AUTH_OTP_TTL_SECONDS", 300))
OTP_LENGTH = 6


def _otp_key(kind: str, user_id: str) -> str:
    return f"anil:otp:{kind}:{user_id}"


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def store_otp(kind: str, user_id: str, code: str) -> None:
    cache.set(_otp_key(kind, user_id), code, timeout=OTP_TTL_SECONDS)


def check_otp(kind: str, user_id: str, code: str) -> bool:
    expected = cache.get(_otp_key(kind, user_id))
    if not expected:
        return False
    ok = str(expected) == str(code).strip()
    if ok:
        cache.delete(_otp_key(kind, user_id))
    return ok


def demo_otp_enabled() -> bool:
    return bool(getattr(settings, "AUTH_DEMO_OTP", True))


def send_phone_otp(user, code: str) -> dict:
    """
    In demo/sandbox mode we do not call an SMS provider.
    Production should plug in Kavenegar / Ghasedak / etc. here.
    """
    logger.info("phone OTP for %s = %s (demo=%s)", user.phone, code, demo_otp_enabled())
    payload = {
        "detail": "کد تأیید موبایل ارسال شد.",
        "channel": "sms",
        "expires_in": OTP_TTL_SECONDS,
    }
    if demo_otp_enabled():
        payload["demo_code"] = code
        payload["detail"] = "کد تأیید موبایل (حالت آزمایشی) آماده است."
    return payload


def send_email_otp(user, code: str) -> dict:
    subject = "کد تأیید ایمیل — آنیل گلد"
    body = f"کد تأیید شما: {code}\nاین کد تا {OTP_TTL_SECONDS // 60} دقیقه معتبر است."
    sent = False
    try:
        if user.email:
            sent = send_mail(
                subject,
                body,
                getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@anil.gold"),
                [user.email],
                fail_silently=True,
            )
    except Exception:
        logger.exception("email OTP send failed for %s", user.email)
    logger.info("email OTP for %s = %s sent=%s demo=%s", user.email, code, sent, demo_otp_enabled())
    payload = {
        "detail": "کد تأیید ایمیل ارسال شد.",
        "channel": "email",
        "expires_in": OTP_TTL_SECONDS,
    }
    if demo_otp_enabled() or not sent:
        payload["demo_code"] = code
        payload["detail"] = "کد تأیید ایمیل (حالت آزمایشی) آماده است."
    return payload
