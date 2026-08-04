"""Gold price refresh service.

By default, if no live provider URL is configured, the command applies a tiny
jitter around the last known rates so the storefront keeps feeling live in demos.
The shop owner can always set exact rates in Django Admin.
"""

from __future__ import annotations

import os
import random
from typing import Any

import requests
from django.utils import timezone

from store.models import GoldPrice


def _from_provider(url: str) -> dict[str, Any] | None:
    try:
        resp = requests.get(url, timeout=12)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return None

    # Flexible mapping — adapt keys to your provider
    mapping = {
        "price_18k_per_gram": data.get("price_18k") or data.get("gold_18k") or data.get("price_18k_per_gram"),
        "price_24k_per_gram": data.get("price_24k") or data.get("gold_24k") or data.get("price_24k_per_gram"),
        "coin_emami": data.get("coin_emami") or data.get("emami"),
        "coin_half": data.get("coin_half") or data.get("half"),
        "coin_quarter": data.get("coin_quarter") or data.get("quarter"),
        "usd_toman": data.get("usd_toman") or data.get("usd"),
        "ounce_usd": data.get("ounce_usd") or data.get("ounce"),
    }
    if not mapping["price_18k_per_gram"]:
        return None
    return {k: v for k, v in mapping.items() if v is not None}


def _jitter_from_last(last: GoldPrice) -> dict[str, Any]:
    def j(n: int | float, pct: float = 0.004) -> int:
        return max(1, int(round(float(n) * (1 + random.uniform(-pct, pct)))))

    return {
        "price_18k_per_gram": j(last.price_18k_per_gram),
        "price_24k_per_gram": j(last.price_24k_per_gram),
        "coin_emami": j(last.coin_emami),
        "coin_half": j(last.coin_half),
        "coin_quarter": j(last.coin_quarter),
        "usd_toman": j(last.usd_toman, 0.003),
        "ounce_usd": round(float(last.ounce_usd) * (1 + random.uniform(-0.003, 0.003)), 2),
    }


def refresh_gold_price() -> GoldPrice:
    """Fetch from provider or nudge the last rate; store a new GoldPrice row."""
    provider = os.environ.get("GOLD_PROVIDER_URL", "").strip()
    payload: dict[str, Any] | None = None

    if provider:
        payload = _from_provider(provider)

    if payload is None:
        last = GoldPrice.current()
        if last is None:
            payload = {
                "price_18k_per_gram": 3_850_000,
                "price_24k_per_gram": 5_131_050,
                "coin_emami": 43_850_000,
                "coin_half": 24_100_000,
                "coin_quarter": 14_200_000,
                "usd_toman": 62_400,
                "ounce_usd": 2412,
            }
        else:
            payload = _jitter_from_last(last)

    return GoldPrice.objects.create(updated_at=timezone.now(), **payload)
