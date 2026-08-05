export function faNum(n: number | string): string {
  return Number(n).toLocaleString('fa-IR');
}

export function faPrice(n: number): string {
  return Math.round(n).toLocaleString('fa-IR');
}

export function calcPrice(
  weightG: number,
  goldPrice: number,
  feeRatio: number,
  stoneValue: number
) {
  const gold = weightG * goldPrice;
  const fee = gold * feeRatio;
  const tax = fee * 0.09;
  const total = gold + fee + stoneValue + tax;
  return { gold: Math.round(gold), fee: Math.round(fee), stone: stoneValue, tax: Math.round(tax), total: Math.round(total) };
}
