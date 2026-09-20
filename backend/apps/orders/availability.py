"""Storefront order availability helpers."""

from __future__ import annotations

from django.conf import settings


def orders_are_enabled() -> bool:
    """True when customers may create/pay orders.

    Env ``ORDERS_ENABLED`` (if set) hard-overrides SiteSettings.
    Otherwise SiteSettings.orders_enabled is used (default False).
    """
    env = getattr(settings, "ORDERS_ENABLED_ENV", None)
    if env is not None:
        return bool(env)
    try:
        from apps.store.models import SiteSettings

        return bool(SiteSettings.load().orders_enabled)
    except Exception:
        return False


def sales_closed_message() -> str:
    try:
        from apps.store.models import SiteSettings

        msg = (SiteSettings.load().sales_closed_message or "").strip()
        if msg:
            return msg
    except Exception:
        pass
    return "فروش آنلاین موقتاً بسته است. به‌زودی با درگاه پرداخت باز می‌شود."
