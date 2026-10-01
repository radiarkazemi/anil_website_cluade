export function faNum(n: number | string): string {
  return Number(n).toLocaleString('fa-IR');
}

/** Max fractional grams supported in storefront calculators. */
export const WEIGHT_DECIMALS = 3;

/** Round grams to at most `decimals` places (default 3). */
export function roundWeightG(n: number, decimals = WEIGHT_DECIMALS): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/**
 * Parse a weight (grams) string with Persian/Arabic digits.
 * Keeps up to 3 decimal places; returns 0 when empty/invalid.
 */
export function parseWeightGrams(raw: string, maxDecimals = WEIGHT_DECIMALS): number {
  let s = String(raw ?? '')
    .trim()
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '');
  if (!s) return 0;
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
    const [whole, frac = ''] = s.split('.');
    s = `${whole}.${frac.slice(0, maxDecimals)}`;
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return 0;
  return roundWeightG(n, maxDecimals);
}

/** Format grams for UI — up to 3 decimals, trim trailing zeros. */
export function faWeight(n: number | string, maxDecimals = WEIGHT_DECIMALS): string {
  const v = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(v)) return '۰';
  return roundWeightG(v, maxDecimals).toLocaleString('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/** Serialize grams for controlled inputs (latin digits, up to 3 decimals). */
export function formatWeightInput(n: number, maxDecimals = WEIGHT_DECIMALS): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  const rounded = roundWeightG(n, maxDecimals);
  return String(rounded);
}

/** Persian calendar date, e.g. ۲۹ شهریور ۱۴۰۴ */
export function faDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return d.toLocaleDateString('fa-IR');
  }
}

/** Rough reading time from body text. */
export function readingMinutes(body?: string | null): number {
  const text = (body || '').trim();
  if (!text) return 1;
  const chars = text.replace(/\s+/g, '').length;
  return Math.max(1, Math.round(chars / 900));
}

export function faPrice(n: number): string {
  return Math.round(n).toLocaleString('fa-IR');
}

/**
 * Convert fee_ratio (e.g. 0.095) to percent with one decimal (9.5).
 * Avoids Math.round(9.5) → 10 which was showing اجرت 9.5% as 10%.
 */
export function feeRatioToPercent(ratio: number | string): number {
  const r = Number(ratio);
  if (!Number.isFinite(r)) return 0;
  return Math.round(r * 1000) / 10;
}

/** Persian display for اجرت percent, e.g. ۰٫۰۹۵ → ٪۹٫۵ */
export function faFeePct(ratio: number | string): string {
  return faNum(feeRatioToPercent(ratio));
}

/**
 * Parse اجرت input into fee_ratio.
 * Accepts:
 *   - ratio: 0.095 / 0.20
 *   - percent: 9.5 / 20 / ٪۹٫۵
 *   - shop shorthand: 0.9.5 → 9.5% → 0.095
 */
export function parseFeeRatio(value: unknown, fallback = 0.2): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1 ? value / 100 : value;
  }
  let raw = String(value ?? '')
    .trim()
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[٪%]/g, '')
    .replace(/,/g, '')
    .replace(/[٫،]/g, '.');
  if (!raw) return fallback;

  // Shop notation: 0.9.5 or 0.12.5 → 9.5% / 12.5%
  const shop = raw.match(/^0\.(\d+)\.(\d+)$/);
  if (shop) {
    const pct = Number(`${shop[1]}.${shop[2]}`);
    return Number.isFinite(pct) ? pct / 100 : fallback;
  }

  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  // Values like 9.5 or 20 are percents; 0.095 / 0.20 are ratios
  if (n > 1) return n / 100;
  return n;
}

/** Seller profit ratio — applied in total, never shown in customer breakdown. */
export const PROFIT_RATIO = 0.07;
export const TAX_RATIO = 0.09;

/**
 * Iranian jewelry formula (must match backend apps.store.pricing):
 *   gold   = weight × rate
 *   ojrat  = gold × feeRatio          (= gold_weight_value × اجرت)
 *   profit = (gold + ojrat) × 7%      ← included in total, omitted from UI
 *   tax    = (ojrat + profit) × 9%
 *   total  = gold + ojrat + profit + stone + tax
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
