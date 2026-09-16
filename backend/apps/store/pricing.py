"""
Iranian jewelry retail price formula (فاکتور رسمی):

  gold   = weight_g × rate_18k                    # ارزش طلا
  ojrat  = gold × fee_ratio                       # اجرت = (gold weight × ojrat%)
  profit = (gold + ojrat) × 0.07                  # سود — after gold×ojrat; hidden in UI
  tax    = (ojrat + profit) × 0.09                # مالیات = (ojrat + profit) × 9%
  total  = gold + ojrat + profit + stone + tax

Public API / customer UI must omit the profit line; it is still included in total.
"""

from __future__ import annotations

import re
from decimal import Decimal

PROFIT_RATIO = 0.07
TAX_RATIO = 0.09

_PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


def parse_fee_ratio(value, default: float | Decimal = 0.2) -> Decimal:
    """
    Normalize اجرت input to a ratio Decimal.

    Accepts:
      - ratio: 0.095 / 0.20
      - percent: 9.5 / 20
      - shop shorthand: 0.9.5 → 9.5% → 0.095
    """
    if value is None or value == "":
        return Decimal(str(default))
    if isinstance(value, (int, float, Decimal)):
        n = float(value)
        if n > 1:
            n = n / 100.0
        return Decimal(str(round(n, 4)))

    raw = (
        str(value)
        .strip()
        .translate(_PERSIAN_DIGITS)
        .replace("%", "")
        .replace("٪", "")
        .replace(",", "")
        .replace("٫", ".")
        .replace("،", ".")
    )
    if not raw:
        return Decimal(str(default))

    shop = re.fullmatch(r"0\.(\d+)\.(\d+)", raw)
    if shop:
        pct = float(f"{shop.group(1)}.{shop.group(2)}")
        return Decimal(str(round(pct / 100.0, 4)))

    try:
        n = float(raw)
    except ValueError:
        return Decimal(str(default))
    if n > 1:
        n = n / 100.0
    return Decimal(str(round(n, 4)))


def compute_breakdown(
    weight_g: float | None,
    gold_price_per_gram: float | int,
    fee_ratio: float,
    stone_value: float | int = 0,
    *,
    include_profit: bool = False,
) -> dict:
    """
    Return rounded toman components.

    When weight is missing, total is None.
    Profit is always applied into total; only exposed when include_profit=True.
    """
    stone = int(stone_value or 0)
    if weight_g is None or float(weight_g) <= 0:
        out = {"gold": 0, "fee": 0, "stone": stone, "tax": 0, "total": None}
        if include_profit:
            out["profit"] = 0
        return out

    gold_i = round(float(weight_g) * float(gold_price_per_gram))
    # ojrat = (gold weight value) × fee_ratio
    fee_i = round(gold_i * float(fee_ratio))
    # profit applied after gold×ojrat: (gold + ojrat) × 7%
    profit_i = round((gold_i + fee_i) * PROFIT_RATIO)
    # مالیات = (ojrat + profit) × 9%
    tax_i = round((fee_i + profit_i) * TAX_RATIO)
    total_i = gold_i + fee_i + profit_i + stone + tax_i

    out = {
        "gold": gold_i,
        "fee": fee_i,
        "stone": stone,
        "tax": tax_i,
        "total": total_i,
    }
    if include_profit:
        out["profit"] = profit_i
    return out
