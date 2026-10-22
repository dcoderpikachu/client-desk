const SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹", CAD: "CA$", AUD: "A$", CHF: "CHF ", SEK: "SEK ", DKK: "DKK " };

export function usd(n: number, opts: { cents?: boolean } = {}): string {
  const neg = n < 0;
  const s = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  });
  return `${neg ? "−" : ""}$${s}`;
}

export function usdCompact(n: number): string {
  if (Math.abs(n) >= 1000) {
    const k = n / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return `$${Math.round(n)}`;
}

export function money(n: number, currency: string, opts: { cents?: boolean } = {}): string {
  if (currency === "INR") return inr(n);
  const sym = SYMBOLS[currency] ?? `${currency} `;
  const neg = n < 0;
  const s = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  });
  return `${neg ? "−" : ""}${sym}${s}`;
}

/** ₹4,58,883 */
export function inr(n: number): string {
  const neg = n < 0;
  return `${neg ? "−" : ""}₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
}

/** ₹6.84L from one lakh up, otherwise the full figure. */
export function inrShort(n: number): string {
  const a = Math.abs(n);
  const neg = n < 0 ? "−" : "";
  if (a >= 1e7) return `${neg}₹${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${neg}₹${(a / 1e5).toFixed(2)}L`;
  return inr(n);
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function hours(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)} h`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
