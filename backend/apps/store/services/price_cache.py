"""In-memory live gold quote cache + market_rows builder (no دلار)."""

from __future__ import annotations

import threading
from copy import deepcopy
from datetime import datetime
from typing import Any

from django.utils import timezone

from apps.store.services.faraz import gram18_to_mesghal17

_lock = threading.RLock()
_latest: dict[str, Any] | None = None


def market_rows_from_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    mesghal = int(payload.get("mesghal_17") or 0)
    if not mesghal and payload.get("price_18k_per_gram"):
        mesghal = gram18_to_mesghal17(payload["price_18k_per_gram"])
    return [
        {
            "key": "g18",
            "label": "طلای ۱۸ عیار",
            "v": int(payload.get("price_18k_per_gram") or 0),
            "unit": "هر گرم · تومان",
            "dollar": False,
        },
        {
            "key": "g24",
            "label": "طلای ۲۴ عیار",
            "v": int(payload.get("price_24k_per_gram") or 0),
            "unit": "هر گرم · تومان",
            "dollar": False,
        },
        {
            "key": "mes",
            "label": "مثقال ۱۷",
            "v": mesghal,
            "unit": "تومان",
            "dollar": False,
        },
        {
            "key": "sek",
            "label": "سکه امامی",
            "v": int(payload.get("coin_emami") or 0),
            "unit": "تومان",
            "dollar": False,
        },
        {
            "key": "nim",
            "label": "نیم سکه",
            "v": int(payload.get("coin_half") or 0),
            "unit": "تومان",
            "dollar": False,
        },
        {
            "key": "rob",
            "label": "ربع سکه",
            "v": int(payload.get("coin_quarter") or 0),
            "unit": "تومان",
            "dollar": False,
        },
        {
            "key": "ons",
            "label": "انس جهانی",
            "v": float(payload.get("ounce_usd") or 0),
            "unit": "دلار",
            "dollar": True,
        },
    ]


def public_quote(payload: dict[str, Any], *, source: str, created_at: datetime | None = None) -> dict[str, Any]:
    created = created_at or timezone.now()
    mesghal = int(payload.get("mesghal_17") or 0)
    if not mesghal and payload.get("price_18k_per_gram"):
        mesghal = gram18_to_mesghal17(payload["price_18k_per_gram"])
    out = {
        "id": payload.get("id"),
        "price_18k_per_gram": int(payload.get("price_18k_per_gram") or 0),
        "price_24k_per_gram": int(payload.get("price_24k_per_gram") or 0),
        "mesghal": mesghal,
        "mesghal_17": mesghal,
        "coin_emami": int(payload.get("coin_emami") or 0),
        "coin_half": int(payload.get("coin_half") or 0),
        "coin_quarter": int(payload.get("coin_quarter") or 0),
        "usd_toman": 0,
        "ounce_usd": float(payload.get("ounce_usd") or 0),
        "source": source,
        "created_at": created.isoformat(),
    }
    out["market_rows"] = market_rows_from_payload(out)
    return out


def set_latest(quote: dict[str, Any]) -> dict[str, Any]:
    global _latest
    with _lock:
        _latest = deepcopy(quote)
        return deepcopy(_latest)


def get_latest() -> dict[str, Any] | None:
    with _lock:
        return deepcopy(_latest) if _latest else None


def signature(payload: dict[str, Any]) -> tuple:
    """Identity for DB persist — ignore tiny ounce float noise."""
    return (
        int(payload.get("price_18k_per_gram") or 0),
        int(payload.get("price_24k_per_gram") or 0),
        int(payload.get("mesghal_17") or payload.get("mesghal") or 0),
        int(payload.get("coin_emami") or 0),
        int(payload.get("coin_half") or 0),
        int(payload.get("coin_quarter") or 0),
        int(round(float(payload.get("ounce_usd") or 0))),
    )
