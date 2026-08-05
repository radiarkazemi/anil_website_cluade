"""Gold price refresh — live Faraz/sekefarshad/goldbridge providers or demo jitter."""

from __future__ import annotations

import logging
import os
import random
from datetime import timedelta
from typing import Any

from django.utils import timezone

from apps.analytics.services.mongodb import log_price_snapshot
from apps.store.models import GoldPrice
from apps.store.services.providers import fetch_live_market

logger = logging.getLogger(__name__)


def _jitter(n: int | float, pct: float = 0.004) -> int:
    return max(1, int(round(float(n) * (1 + random.uniform(-pct, pct)))))


def _merge_with_last(payload: dict[str, Any], last: GoldPrice | None) -> dict[str, Any]:
    """Keep previous coin/FX values when the live feed omits them."""
    if last is None:
        return payload
    out = dict(payload)
    for key in ("coin_emami", "coin_half", "coin_quarter", "usd_toman", "ounce_usd", "price_24k_per_gram"):
        if not out.get(key):
            out[key] = getattr(last, key)
    return out


def fetch_online_payload() -> tuple[dict[str, Any] | None, str]:
    payload, source = fetch_live_market()
    if not payload:
        return None, ""
    last = GoldPrice.current()
    return _merge_with_last(payload, last), source


def refresh_gold_price(*, force_live: bool = True, allow_jitter: bool = True) -> GoldPrice:
    """Create a new GoldPrice row from live source (preferred) and log to MongoDB."""
    payload: dict[str, Any] | None = None
    source = "manual"

    if force_live or os.environ.get("GOLD_LIVE", "1").strip() not in ("0", "false", "no"):
        payload, source = fetch_online_payload()
        if payload:
            logger.info(
                "live gold refresh ok source=%s g18=%s",
                source,
                payload.get("price_18k_per_gram"),
            )

    if payload is None and allow_jitter:
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
            logger.warning("live gold providers failed — using jitter fallback")

    if payload is None:
        raise RuntimeError("هیچ منبع قیمتی در دسترس نیست.")

    row = GoldPrice.objects.create(source=source, created_at=timezone.now(), **payload)
    log_price_snapshot({**payload, "source": source})
    return row


def maybe_auto_refresh() -> GoldPrice | None:
    """Refresh if the latest snapshot is older than GOLD_STALE_SECONDS."""
    stale = int(os.environ.get("GOLD_STALE_SECONDS", "120"))
    last = GoldPrice.current()
    if last and timezone.now() - last.created_at < timedelta(seconds=stale):
        return last
    try:
        return refresh_gold_price(force_live=True, allow_jitter=False)
    except Exception as exc:
        logger.warning("auto refresh failed: %s", exc)
        return last
