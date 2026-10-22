// Exchange rates are stored as units of currency per 1 USD, one row per day.
// A lookup uses the latest rate on or before the date asked for.

export type FxRow = { day: string; currency: string; per_usd: number };
export type Fx = Record<string, { days: string[]; rates: number[] }>;

const FALLBACK: Record<string, number> = { INR: 84, EUR: 0.92, GBP: 0.79, CAD: 1.37, AUD: 1.52, CHF: 0.88, SEK: 10.6, DKK: 6.85 };

export function buildFx(rows: FxRow[]): Fx {
  const fx: Fx = {};
  const sorted = [...rows].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  for (const r of sorted) {
    const entry = (fx[r.currency] ??= { days: [], rates: [] });
    entry.days.push(r.day);
    entry.rates.push(Number(r.per_usd));
  }
  return fx;
}

export function perUsd(fx: Fx, currency: string, day: string): number {
  if (currency === "USD") return 1;
  const entry = fx[currency];
  if (!entry || entry.days.length === 0) return FALLBACK[currency] ?? 1;
  const { days, rates } = entry;
  if (day < days[0]) return rates[0];
  let lo = 0;
  let hi = days.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (days[mid] <= day) lo = mid;
    else hi = mid - 1;
  }
  return rates[lo];
}

export function toUsd(fx: Fx, amount: number, currency: string, day: string): number {
  return amount / perUsd(fx, currency, day);
}

export function usdToInr(fx: Fx, amountUsd: number, day: string): number {
  return amountUsd * perUsd(fx, "INR", day);
}

export function latestDay(fx: Fx, currency = "INR"): string | null {
  const e = fx[currency];
  return e && e.days.length ? e.days[e.days.length - 1] : null;
}
