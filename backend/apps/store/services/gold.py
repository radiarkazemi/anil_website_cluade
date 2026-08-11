"""Gold price refresh — Faraz live feed (preferred) or demo jitter."""

from __future__ import annotations

import logging
import os
import random
from datetime import timedelta
from typing import Any

from django.utils import timezone

from apps.analytics.services.mongodb import log_price_snapshot
from apps.store.models import GoldPrice
from apps.store.services import price_cache
from apps.store.services.faraz import gram18_to_mesghal17
from apps.store.services.providers import fetch_live_market

logger = logging.getLogger(__name__)

DB_FIELDS = (
    "price_18k_per_gram",
    "price_24k_per_gram",
    "mesghal_17",
    "coin_emami",
    "coin_half",
    "coin_quarter",
    "usd_toman",
    "ounce_usd",
)


def _jitter(n: int | float, pct: float = 0.004) -> int:
    return max(1, int(round(float(n) * (1 + random.uniform(-pct, pct)))))


def _merge_with_last(payload: dict[str, Any], last: GoldPrice | None) -> dict[str, Any]:
    """Keep previous coin/FX values when the live feed omits them."""
    if last is None:
        return payload
    out = dict(payload)
    for key in ("coin_emami", "coin_half", "coin_quarter", "ounce_usd", "price_24k_per_gram", "mesghal_17"):
        if not out.get(key):
            out[key] = getattr(last, key, 0)
    out["usd_toman"] = 0
    return out


def _db_kwargs(payload: dict[str, Any]) -> dict[str, Any]:
    data = {k: payload.get(k, 0) for k in DB_FIELDS}
    data["usd_toman"] = 0
    if not data.get("mesghal_17") and data.get("price_18k_per_gram"):
        data["mesghal_17"] = gram18_to_mesghal17(data["price_18k_per_gram"])
    return data


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
                "live gold refresh ok source=%s g18=%s mesghal=%s",
                source,
                payload.get("price_18k_per_gram"),
                payload.get("mesghal_17"),
            )

    if payload is None and allow_jitter:
        last = GoldPrice.current()
        if last is None:
            payload = {
                "price_18k_per_gram": 3_850_000,
                "price_24k_per_gram": 5_131_050,
                "mesghal_17": gram18_to_mesghal17(3_850_000),
                "coin_emami": 43_850_000,
                "coin_half": 24_100_000,
                "coin_quarter": 14_200_000,
                "usd_toman": 0,
                "ounce_usd": 2412,
            }
            source = "seed"
        else:
            payload = {
                "price_18k_per_gram": _jitter(last.price_18k_per_gram),
                "price_24k_per_gram": _jitter(last.price_24k_per_gram),
                "mesghal_17": _jitter(last.mesghal_17 or gram18_to_mesghal17(last.price_18k_per_gram)),
                "coin_emami": _jitter(last.coin_emami),
                "coin_half": _jitter(last.coin_half),
                "coin_quarter": _jitter(last.coin_quarter),
                "usd_toman": 0,
                "ounce_usd": round(float(last.ounce_usd) * (1 + random.uniform(-0.003, 0.003)), 2),
            }
            source = "jitter"
            logger.warning("live gold providers failed — using jitter fallback")

    if payload is None:
        raise RuntimeError("هیچ منبع قیمتی در دسترس نیست.")

    row = GoldPrice.objects.create(source=source, created_at=timezone.now(), **_db_kwargs(payload))
    quote = price_cache.public_quote(
        {**_db_kwargs(payload), "id": str(row.id)},
        source=source,
        created_at=row.created_at,
    )
    price_cache.set_latest(quote)
    log_price_snapshot({**_db_kwargs(payload), "source": source})
    return row


def maybe_auto_refresh() -> GoldPrice | None:
    """Refresh if the latest snapshot is older than GOLD_STALE_SECONDS."""
    stale = int(os.environ.get("GOLD_STALE_SECONDS", "120"))
    cached = price_cache.get_latest()
    last = GoldPrice.current()
    if cached and last:
        # Prefer DB row when cache is from streamer; still return last for ORM callers
        try:
            from django.utils.dateparse import parse_datetime

            ts = parse_datetime(cached.get("created_at", ""))
            if ts and timezone.is_naive(ts):
                ts = timezone.make_aware(ts, timezone.get_current_timezone())
            if ts and timezone.now() - ts < timedelta(seconds=stale):
                return last
        except Exception:
            pass
    if last and timezone.now() - last.created_at < timedelta(seconds=stale):
        return last
    try:
        return refresh_gold_price(force_live=True, allow_jitter=False)
    except Exception as exc:
        logger.warning("auto refresh failed: %s", exc)
        return last
