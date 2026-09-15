"""Estimated weight / deposit helpers for made-to-order (no confirmed weight) products."""

from __future__ import annotations

import json
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from statistics import median
from typing import Optional

from django.db.models import Avg

from .models import Product, SiteSettings

# Median weights from the previous Vitrin catalog (model history) — used when
# live peers have no confirmed weights yet.
HISTORICAL_CATEGORY_WEIGHT_G = {
    "النگو": 3.68,
    "انگشتر": 2.61,
    "دستبند": 4.52,
    "زنجیر": 2.08,
    "ست کامل": 4.98,
    "سرویس": 11.45,
    "سولیتر": 2.63,
    "سکه و شمش": 0.17,
    "نیم ست": 7.41,
    "گردنی": 1.87,
    "گوشواره": 2.68,
}


@lru_cache(maxsize=1)
def _historical_from_import_file() -> dict[str, float]:
    """Recompute medians from data/vitrin_import.json when available."""
    candidates = [
        Path(__file__).resolve().parents[3] / "data" / "vitrin_import.json",
        Path("/var/www/anil/data/vitrin_import.json"),
        Path("/workspace/data/vitrin_import.json"),
    ]
    for path in candidates:
        if not path.is_file():
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        rows = payload.get("products") if isinstance(payload, dict) else payload
        if not isinstance(rows, list):
            continue
        by: dict[str, list[float]] = {}
        for row in rows:
            if not isinstance(row, dict):
                continue
            cat = (row.get("category") or "").strip()
            try:
                w = float(row.get("weight_g") or 0)
            except (TypeError, ValueError):
                continue
            if not cat or w <= 0:
                continue
            by.setdefault(cat, []).append(w)
        if by:
            return {cat: round(median(ws), 2) for cat, ws in by.items()}
    return dict(HISTORICAL_CATEGORY_WEIGHT_G)


def peer_weights_for(product: Product) -> list[float]:
    """Weights of other active products in the same category with a confirmed weight."""
    qs = (
        Product.objects.filter(
            category_id=product.category_id,
            is_active=True,
            weight_g__isnull=False,
            weight_g__gt=0,
        )
        .exclude(pk=product.pk)
        .values_list("weight_g", flat=True)
    )
    return [float(w) for w in qs]


def estimated_weight_g(product: Product) -> Optional[Decimal]:
    """
    Weight for pricing / reserve notes:
    1) confirmed weight
    2) median of live same-category peers
    3) historical Vitrin category median (previous models)
    4) catalog-wide live median
    """
    if product.has_weight:
        return Decimal(str(product.weight_g))

    peers = peer_weights_for(product)
    if peers:
        return Decimal(str(round(median(peers), 2)))

    cat_name = getattr(getattr(product, "category", None), "name", "") or ""
    hist = _historical_from_import_file()
    if cat_name in hist:
        return Decimal(str(hist[cat_name]))
    for key, val in hist.items():
        if key in cat_name or cat_name in key:
            return Decimal(str(val))

    vals = list(
        Product.objects.filter(is_active=True, weight_g__isnull=False, weight_g__gt=0)
        .exclude(pk=product.pk)
        .values_list("weight_g", flat=True)[:200]
    )
    if not vals:
        if hist:
            return Decimal(str(round(median(list(hist.values())), 2)))
        return None
    floats = [float(v) for v in vals]
    return Decimal(str(round(median(floats), 2)))


def estimated_price_breakdown(product: Product, gp: int | None = None) -> dict:
    """Price using confirmed or estimated weight. total may still be None if no estimate."""
    from .models import GoldPrice

    w = estimated_weight_g(product)
    if w is None:
        return {
            "gold": 0,
            "fee": 0,
            "stone": int(product.stone_value or 0),
            "tax": 0,
            "total": None,
            "weight_g": None,
        }

    if gp is None:
        current = GoldPrice.current()
        gp = current.price_18k_per_gram if current else 0

    gold = float(w) * float(gp)
    fee = gold * float(product.fee_ratio)
    tax = fee * 0.09
    total = gold + fee + float(product.stone_value) + tax
    return {
        "gold": round(gold),
        "fee": round(fee),
        "stone": int(product.stone_value),
        "tax": round(tax),
        "total": round(total),
        "weight_g": float(w),
    }


def deposit_amount_for(product: Product, gp: int | None = None) -> int:
    """
    بیعانه for made-to-order / no-weight products.
    Uses site fixed deposit, or percent of estimated price if that is higher.
    """
    settings = SiteSettings.load()
    fixed = int(getattr(settings, "made_to_order_deposit", 5_000_000) or 5_000_000)
    percent = float(getattr(settings, "made_to_order_deposit_percent", 0) or 0)

    amount = fixed
    if percent > 0:
        bd = estimated_price_breakdown(product, gp)
        if bd["total"]:
            amount = max(amount, int(round(bd["total"] * percent / 100)))
    return max(amount, 100_000)


def category_avg_weight(category_id) -> Optional[float]:
    row = Product.objects.filter(
        category_id=category_id,
        is_active=True,
        weight_g__isnull=False,
        weight_g__gt=0,
    ).aggregate(avg=Avg("weight_g"))
    avg = row.get("avg")
    return float(avg) if avg is not None else None
