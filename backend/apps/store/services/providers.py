"""
Live gold/coin price providers for Anil Gold.

Order:
  1) Faraz.io public market API  — مثقال ۱۷ / سکه / انس (preferred)
  2) Goldbridge HTTP API
  3) Direct sekefarshad.ir list.php
  4) Generic GOLD_PROVIDER_URL JSON
"""

from __future__ import annotations

import logging
import os
import re
import time
from typing import Any

import requests

from apps.store.services.faraz import (
    fetch_from_faraz,
    gram18_to_gram24,
    mesghal17_to_gram18,
)

logger = logging.getLogger(__name__)

# Legacy sekefarshad conversion (kept for fallback providers only)
MESGHAL17_TO_GRAM18_LEGACY = 4.3318
SOURCE_LIST_URL = os.environ.get(
    "GOLD_SOURCE_LIST_URL",
    "https://sekefarshad.ir/server/api/prices/list.php",
)


def _env_bool(name: str, default: bool = True) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _to_int(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(round(float(value)))
    s = str(value).replace(",", "").replace("،", "").strip()
    if not s:
        return 0
    return int(round(float(s)))


def _norm(text: str) -> str:
    return re.sub(r"[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF0-9a-zA-Z]", "", text or "")


def _clean_entry(entry: dict) -> dict:
    """Port of goldbridge `clean_entry` — derive customer buy/sell."""
    base = entry.get("price")
    buy_off = entry.get("priceBuy")
    sell_off = entry.get("priceSell")
    customer_buy = customer_sell = None
    if base is not None and buy_off is not None and sell_off is not None:
        customer_buy = float(base) + float(sell_off)
        customer_sell = float(base) + float(buy_off)
    elif base is not None:
        customer_buy = customer_sell = float(base)

    return {
        "id": entry.get("id"),
        "name": entry.get("name") or "",
        "type": entry.get("type"),
        "ayar": entry.get("ayar"),
        "item_weight": entry.get("itemWeight") or entry.get("item_weight"),
        "active": bool(entry.get("isActive", entry.get("active", True))),
        "buy": customer_buy,
        "sell": customer_sell,
        "base_price": base,
        "last_update_time": entry.get("lastUpdateTime") or entry.get("last_update_time"),
    }


def _rial_to_toman(value: float | int | None) -> int:
    if value is None:
        return 0
    n = float(value)
    if _env_bool("GOLD_RIAL_TO_TOMAN", True):
        n = n / 10.0
    return int(round(n))


def _pick_quote(entry: dict) -> int:
    buy = entry.get("buy")
    if buy is not None:
        return _rial_to_toman(buy)
    if entry.get("base_price") is not None:
        return _rial_to_toman(entry["base_price"])
    return 0


def _is_mesghal_quote(entry: dict) -> bool:
    ayar = entry.get("ayar")
    name = entry.get("name") or ""
    if ayar in (750, 17, "750", "17"):
        return True
    if "مثقال" in name:
        return True
    quote = _pick_quote(entry)
    if entry.get("type") == 1 and quote >= 40_000_000:
        return True
    if "نقد" in name and entry.get("type") == 1:
        return True
    return False


def _gram18_from_entry(entry: dict) -> tuple[int, int]:
    """Return (gram18, mesghal17)."""
    quote = _pick_quote(entry)
    if not quote:
        return 0, 0
    if _is_mesghal_quote(entry):
        return mesghal17_to_gram18(quote), quote
    return quote, 0


def map_catalog_to_payload(entries: list[dict]) -> dict[str, Any] | None:
    """Map a goldbridge/sekefarshad catalog into Anil GoldPrice fields."""
    cleaned = [_clean_entry(e) for e in entries if isinstance(e, dict)]
    if not cleaned:
        return None

    target_id = os.environ.get("GOLD_TARGET_ITEM_ID", "").strip()
    primary = None
    if target_id:
        primary = next((e for e in cleaned if str(e.get("id")) == target_id), None)

    if primary is None:
        candidates = [
            e
            for e in cleaned
            if e.get("type") == 1 and e.get("ayar") in (750, "750", 18, "18")
        ]
        if not candidates:
            candidates = [e for e in cleaned if e.get("type") == 1]
        preferred = [
            e
            for e in candidates
            if "نقدی" in (e.get("name") or "") or "نقد" in (e.get("name") or "")
        ]
        primary = (preferred or candidates or cleaned)[0]

    g18, mesghal = _gram18_from_entry(primary)
    if g18 <= 0:
        return None

    def find_coin(*needles: str) -> int:
        for e in cleaned:
            if e.get("type") != 2:
                continue
            name = e.get("name") or ""
            if any(n in name for n in needles):
                return _pick_quote(e)
        return 0

    coin_emami = find_coin("سکه تمام", "سکه امامی", "امامی")
    coin_half = find_coin("نیم سکه", "نیم")
    coin_quarter = find_coin("ربع سکه") or find_coin("ربع")

    return {
        "price_18k_per_gram": g18,
        "price_24k_per_gram": gram18_to_gram24(g18),
        "mesghal_17": mesghal or 0,
        "coin_emami": coin_emami,
        "coin_half": coin_half,
        "coin_quarter": coin_quarter,
        "usd_toman": 0,
        "ounce_usd": 0.0,
        "meta": {
            "primary_id": primary.get("id"),
            "primary_name": primary.get("name"),
            "items": len(cleaned),
        },
    }


def fetch_from_goldbridge() -> tuple[dict[str, Any] | None, str]:
    base = os.environ.get("GOLD_BRIDGE_URL", "").strip().rstrip("/")
    if not base:
        return None, ""

    url = f"{base}/prices"
    headers = {}
    key = os.environ.get("GOLD_BRIDGE_API_KEY", "").strip()
    if key:
        headers["Authorization"] = f"Bearer {key}"

    try:
        resp = requests.get(url, headers=headers, timeout=12)
        resp.raise_for_status()
        data = resp.json()
        entries = data.get("prices") or data.get("items") or []
        normalized = []
        for e in entries:
            if e.get("buy") is not None and e.get("price") is None:
                normalized.append(
                    {
                        "id": e.get("id") or e.get("goldbridge_item_id"),
                        "name": e.get("name"),
                        "type": e.get("type"),
                        "ayar": e.get("ayar"),
                        "itemWeight": e.get("item_weight") or e.get("itemWeight"),
                        "isActive": e.get("active", True),
                        "price": e.get("buy"),
                        "priceBuy": 0,
                        "priceSell": 0,
                        "lastUpdateTime": e.get("last_update_time"),
                    }
                )
            else:
                normalized.append(e)
        payload = map_catalog_to_payload(normalized)
        if payload:
            return payload, "goldbridge"
    except Exception as exc:
        logger.warning("goldbridge fetch failed: %s", exc)
    return None, ""


def fetch_from_sekefarshad() -> tuple[dict[str, Any] | None, str]:
    """Legacy upstream used by goldbridge — kept as fallback."""
    uid = os.environ.get("GOLD_SOURCE_UID", "").strip()
    utoken = os.environ.get("GOLD_SOURCE_UTOKEN", "").strip()
    data_body: dict[str, str] = {"all": "true"}
    if uid:
        data_body["uID"] = uid
    if utoken:
        data_body["uToken"] = utoken

    best: list[dict] = []
    try:
        for attempt in range(3):
            resp = requests.post(SOURCE_LIST_URL, data=data_body, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            if data.get("state") is False:
                logger.warning("sekefarshad state=false: %s", data.get("msg"))
                return None, ""
            entries = data.get("prices") or []
            if len(entries) > len(best):
                best = entries
            if len(entries) >= 3:
                break
            if attempt < 2:
                time.sleep(0.35)

        payload = map_catalog_to_payload(best)
        if payload:
            return payload, "sekefarshad"
    except Exception as exc:
        logger.warning("sekefarshad fetch failed: %s", exc)
    return None, ""


def fetch_from_generic_provider() -> tuple[dict[str, Any] | None, str]:
    provider = os.environ.get("GOLD_PROVIDER_URL", "").strip()
    if not provider:
        return None, ""
    try:
        resp = requests.get(provider, timeout=12)
        resp.raise_for_status()
        data = resp.json()
        g18 = _to_int(
            data.get("price_18k_per_gram") or data.get("price_18k") or data.get("gold_18k")
        )
        payload = {
            "price_18k_per_gram": g18,
            "price_24k_per_gram": _to_int(
                data.get("price_24k_per_gram") or data.get("price_24k") or data.get("gold_24k") or 0
            ),
            "mesghal_17": _to_int(data.get("mesghal_17") or data.get("mesghal") or 0),
            "coin_emami": _to_int(data.get("coin_emami") or data.get("coin_today") or 0),
            "coin_half": _to_int(data.get("coin_half") or 0),
            "coin_quarter": _to_int(data.get("coin_quarter") or 0),
            "usd_toman": 0,
            "ounce_usd": float(data.get("ounce_usd") or data.get("ounce") or 0),
        }
        if payload["price_18k_per_gram"] > 0:
            if not payload["price_24k_per_gram"]:
                payload["price_24k_per_gram"] = gram18_to_gram24(payload["price_18k_per_gram"])
            return payload, "api"
    except Exception as exc:
        logger.warning("generic provider fetch failed: %s", exc)
    return None, ""


def fetch_live_market() -> tuple[dict[str, Any] | None, str]:
    """Try providers in order. Returns (payload, source_name)."""
    for fetcher in (
        fetch_from_faraz,
        fetch_from_goldbridge,
        fetch_from_sekefarshad,
        fetch_from_generic_provider,
    ):
        payload, source = fetcher()
        if payload and payload.get("price_18k_per_gram"):
            payload = {k: v for k, v in payload.items() if k not in ("meta", "raw")}
            return payload, source
    return None, ""
