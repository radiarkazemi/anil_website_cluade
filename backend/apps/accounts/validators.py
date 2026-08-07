"""Iranian identity helpers for Anil Gold customer accounts."""

from __future__ import annotations

import re

from rest_framework.exceptions import ValidationError


def normalize_iran_mobile(value: str) -> str:
    """Normalize to 09xxxxxxxxx (11 digits)."""
    raw = re.sub(r"\D", "", str(value or ""))
    if raw.startswith("0098"):
        raw = "0" + raw[4:]
    elif raw.startswith("98") and len(raw) == 12:
        raw = "0" + raw[2:]
    elif raw.startswith("9") and len(raw) == 10:
        raw = "0" + raw
    if not re.fullmatch(r"09\d{9}", raw):
        raise ValidationError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.")
    return raw


def validate_iran_national_code(value: str) -> str:
    """Validate Iranian national ID (کد ملی) with checksum."""
    code = re.sub(r"\D", "", str(value or ""))
    if len(code) != 10 or not code.isdigit():
        raise ValidationError("کد ملی باید ۱۰ رقم باشد.")
    if code == code[0] * 10:
        raise ValidationError("کد ملی معتبر نیست.")
    check = int(code[9])
    s = sum(int(code[i]) * (10 - i) for i in range(9)) % 11
    if not ((s < 2 and check == s) or (s >= 2 and check == 11 - s)):
        raise ValidationError("کد ملی معتبر نیست.")
    return code


def validate_iran_postal_code(value: str) -> str:
    digits = re.sub(r"\D", "", str(value or ""))
    if len(digits) != 10:
        raise ValidationError("کد پستی باید ۱۰ رقم باشد.")
    return digits


PROFILE_REQUIRED_FIELDS = (
    "full_name",
    "phone",
    "email",
    "national_code",
    "address",
    "city",
    "postal_code",
)

PROFILE_FIELD_LABELS = {
    "full_name": "نام و نام خانوادگی",
    "phone": "موبایل",
    "email": "ایمیل",
    "national_code": "کد ملی",
    "address": "آدرس",
    "city": "شهر",
    "postal_code": "کد پستی",
    "phone_verified": "تأیید موبایل",
    "email_verified": "تأیید ایمیل",
}


def profile_missing_fields(user) -> list[str]:
    missing: list[str] = []
    for field in PROFILE_REQUIRED_FIELDS:
        val = getattr(user, field, None)
        if val is None or str(val).strip() == "":
            missing.append(field)
    if not getattr(user, "phone_verified", False):
        missing.append("phone_verified")
    if not getattr(user, "email_verified", False):
        missing.append("email_verified")
    return missing


def is_profile_ready(user) -> bool:
    return not profile_missing_fields(user)
