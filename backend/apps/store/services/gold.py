"""Gold price refresh — provider API or demo jitter."""

from __future__ import annotations

import os
import random
from typing import Any

from django.utils import timezone

from apps.analytics.services.mongodb import log_price_snapshot
from apps.store.models import GoldPrice


def _jitter(n: int | float, pct: float = 0.004) -> int:
    return max(1, int(round(float(n) * (1 + random.uniform(-pct, pct)))))


def refresh_gold_price() -> GoldPrice:
    """Create a new GoldPrice row and log to MongoDB."""
    provider = os.environ.get("GOLD_PROVIDER_URL", "").strip()
    payload: dict[str, Any] | None = None
    source = "manual"

    if provider:
        try:
            import requests

            resp = requests.get(provider, timeout=12)
            resp.raise_for_status()
            data = resp.json()
            payload = {
                "price_18k_per_gram": data.get("price_18k") or data.get("gold_18k") or data["price_18k_per_gram"],
                "price_24k_per_gram": data.get("price_24k") or data.get("gold_24k", 0),
                "coin_emami": data.get("coin_emami", 0),
                "coin_half": data.get("coin_half", 0),
                "coin_quarter": data.get("coin_quarter", 0),
                "usd_toman": data.get("usd_toman") or data.get("usd", 0),
                "ounce_usd": data.get("ounce_usd") or data.get("ounce", 0),
            }
            source = "api"
        except Exception:
            payload = None

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
            source = "seed"
        else:
            payload = {
                "price_18k_per_gram": _jitter(last.price_18k_per_gram),
                "price_24k_per_gram": _jitter(last.price_24k_per_gram),
                "coin_emami": _jitter(last.coin_emami),
                "coin_half": _jitter(last.coin_half),
                "coin_quarter": _jitter(last.coin_quarter),
                "usd_toman": _jitter(last.usd_toman, 0.003),
                "ounce_usd": round(float(last.ounce_usd) * (1 + random.uniform(-0.003, 0.003)), 2),
            }
            source = "jitter"

    row = GoldPrice.objects.create(source=source, created_at=timezone.now(), **payload)
    log_price_snapshot({**payload, "source": source})
    return row
