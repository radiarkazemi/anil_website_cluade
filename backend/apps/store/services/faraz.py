"""
Faraz.io live gold quotes for Anil Gold.

Primary (no auth): GET /api/public/market/get-data
  symbols:
    abshodeNaghdi   → مثقال ۱۷
    sekkeNewEstjt   → سکه امامی / طرح جدید
    nimSekkeEstjt   → نیم سکه
    robSekkeEstjt   → ربع سکه
    FOREXCOM_XAUUSD → انس جهانی (USD)

Formulas (business):
  گرم ۱۸ = (مثقال ۱۷ × 750 / 705) / 4.608
  طلای ۲۴ = گرم ۱۸ × 999 / 750

Optional authenticated Socket.IO (term-room-@SYMBOL) when
FARAZ_USER_ID + FARAZ_TOKEN are set — lower latency; falls back to HTTP poll.
"""

from __future__ import annotations

import json
import logging
import os
import random
from typing import Any

import requests

logger = logging.getLogger(__name__)

FARAZ_BASE = os.environ.get("FARAZ_BASE_URL", "https://faraz.io").rstrip("/")
MARKET_PATH = "/api/public/market/get-data"

SYMBOL_MESGHAL = "abshodeNaghdi"
SYMBOL_EMAMI = "sekkeNewEstjt"
SYMBOL_HALF = "nimSekkeEstjt"
SYMBOL_QUARTER = "robSekkeEstjt"
SYMBOL_OUNCE = "FOREXCOM_XAUUSD"

SYMBOLS = (
    SYMBOL_MESGHAL,
    SYMBOL_EMAMI,
    SYMBOL_HALF,
    SYMBOL_QUARTER,
    SYMBOL_OUNCE,
)

# گرم ۱۸ = (مثقال ۱۷ * 750 / 705) / 4.608
MESGHAL_GRAMS = 4.608
PURITY_750 = 750
PURITY_705 = 705
PURITY_999 = 999


def mesghal17_to_gram18(mesghal17: float | int) -> int:
    return int(round((float(mesghal17) * PURITY_750 / PURITY_705) / MESGHAL_GRAMS))


def gram18_to_gram24(gram18: float | int) -> int:
    return int(round(float(gram18) * PURITY_999 / PURITY_750))


def gram18_to_mesghal17(gram18: float | int) -> int:
    return int(round(float(gram18) * MESGHAL_GRAMS * PURITY_705 / PURITY_750))


def _extract_price(entry: Any) -> float:
    if entry is None:
        return 0.0
    if isinstance(entry, (int, float)):
        return float(entry)
    if isinstance(entry, dict):
        for key in ("price", "close", "last", "value"):
            if entry.get(key) is not None:
                try:
                    return float(entry[key])
                except (TypeError, ValueError):
                    continue
    return 0.0


def fetch_faraz_market(*, cache: bool = False) -> dict[str, Any] | None:
    """Public Faraz market snapshot for configured symbols."""
    params = {
        "symbolNames": json.dumps(list(SYMBOLS), separators=(",", ":")),
        "cache": "true" if cache else "false",
    }
    try:
        resp = requests.get(
            f"{FARAZ_BASE}{MARKET_PATH}",
            params=params,
            timeout=12,
            headers={
                "Accept": "application/json",
                "Origin": FARAZ_BASE,
                "Referer": f"{FARAZ_BASE}/markets/gold-currency",
                "User-Agent": "AnilGold/1.0",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        if not isinstance(data, dict):
            return None
        return data
    except Exception as exc:
        logger.warning("faraz market fetch failed: %s", exc)
        return None


def map_faraz_to_payload(raw: dict[str, Any]) -> dict[str, Any] | None:
    mesghal = _extract_price(raw.get(SYMBOL_MESGHAL))
    if mesghal <= 0:
        return None

    g18 = mesghal17_to_gram18(mesghal)
    g24 = gram18_to_gram24(g18)
    ounce = _extract_price(raw.get(SYMBOL_OUNCE))

    return {
        "price_18k_per_gram": g18,
        "price_24k_per_gram": g24,
        "mesghal_17": int(round(mesghal)),
        "coin_emami": int(round(_extract_price(raw.get(SYMBOL_EMAMI)))),
        "coin_half": int(round(_extract_price(raw.get(SYMBOL_HALF)))),
        "coin_quarter": int(round(_extract_price(raw.get(SYMBOL_QUARTER)))),
        "usd_toman": 0,
        "ounce_usd": float(ounce) if ounce else 0.0,
        "raw": {
            SYMBOL_MESGHAL: mesghal,
            SYMBOL_EMAMI: _extract_price(raw.get(SYMBOL_EMAMI)),
            SYMBOL_HALF: _extract_price(raw.get(SYMBOL_HALF)),
            SYMBOL_QUARTER: _extract_price(raw.get(SYMBOL_QUARTER)),
            SYMBOL_OUNCE: ounce,
        },
    }


def fetch_from_faraz() -> tuple[dict[str, Any] | None, str]:
    raw = fetch_faraz_market(cache=False)
    if not raw:
        return None, ""
    payload = map_faraz_to_payload(raw)
    if not payload:
        return None, ""
    return payload, "faraz"


def faraz_socket_path() -> str:
    """Faraz load-balances socket.io across /srv00…/srv15/realtime."""
    n = random.randint(0, 15)
    return f"/srv{n:02d}/realtime"
