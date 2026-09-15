"""
Iranian jewelry retail price formula.

  gold   = weight_g × rate_18k
  fee    = gold × fee_ratio          (اجرت ساخت)
  profit = (gold + fee) × 0.07       (سود فروشنده — never shown to customer)
  tax    = (fee + profit) × 0.09     (مالیات ارزش افزوده)
  total  = gold + fee + profit + stone + tax

Public API / customer UI must omit the profit line; it is still included in total.
"""

from __future__ import annotations

PROFIT_RATIO = 0.07
TAX_RATIO = 0.09


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
    fee_i = round(gold_i * float(fee_ratio))
    profit_i = round((gold_i + fee_i) * PROFIT_RATIO)
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
