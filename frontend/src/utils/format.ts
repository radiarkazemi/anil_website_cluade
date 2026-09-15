export function faNum(n: number | string): string {
  return Number(n).toLocaleString('fa-IR');
}

export function faPrice(n: number): string {
  return Math.round(n).toLocaleString('fa-IR');
}

/** Seller profit ratio — applied in total, never shown in customer breakdown. */
export const PROFIT_RATIO = 0.07;
export const TAX_RATIO = 0.09;

/**
 * Iranian jewelry formula (must match backend apps.store.pricing):
 *   gold = weight × rate
 *   fee = gold × feeRatio
 *   profit = (gold + fee) × 7%   ← included in total, omitted from UI
 *   tax = (fee + profit) × 9%
 *   total = gold + fee + profit + stone + tax
 */
export function calcPrice(
  weightG: number,
  goldPrice: number,
  feeRatio: number,
  stoneValue: number
) {
  const gold = Math.round(weightG * goldPrice);
  const fee = Math.round(gold * feeRatio);
  const profit = Math.round((gold + fee) * PROFIT_RATIO);
  const tax = Math.round((fee + profit) * TAX_RATIO);
  const total = gold + fee + profit + stoneValue + tax;
  return { gold, fee, stone: stoneValue, tax, total };
}
