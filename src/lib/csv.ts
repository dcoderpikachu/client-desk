import Papa from "papaparse";

export type Sheet = { headers: string[]; rows: Record<string, string>[] };

export function parseCsv(text: string): Sheet {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, "").trim(), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const headers = (res.meta.fields ?? []).filter(Boolean);
  return { headers, rows: res.data.filter((r) => Object.values(r).some((v) => String(v ?? "").trim())) };
}

/** First header matching any pattern, skipping excluded ones. */
export function findColumn(headers: string[], patterns: RegExp[], exclude: RegExp[] = []): string | null {
  for (const p of patterns) {
    const hit = headers.find((h) => p.test(h) && !exclude.some((x) => x.test(h)));
    if (hit) return hit;
  }
  return null;
}

export function parseAmount(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.includes("-") && /^[^\d]*-/.test(s)) neg = true;
  s = s.replace(/[^\d.,]/g, "");
  // 1.234,56 (European) → 1234.56
  if (/\d\.\d{3},\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Parses the date formats exports commonly use. For an ambiguous 05/06/2026, `order`
 * decides: "mdy" for Upwork (US), "dmy" for most invoicing tools in Europe and India.
 */
export function parseDate(raw: string | undefined | null, order: "mdy" | "dmy" = "dmy"): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    let day: number, month: number;
    if (a > 12) [day, month] = [a, b];
    else if (b > 12) [month, day] = [a, b];
    else if (order === "mdy") [month, day] = [a, b];
    else [day, month] = [a, b];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${y}-${pad(month)}-${pad(day)}`;
  }
  // Oct 21, 2026 · October 21 2026
  m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[1].slice(0, 3).toLowerCase()])}-${pad(+m[2])}`;
  // 21 Oct 2026
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[2].slice(0, 3).toLowerCase()])}-${pad(+m[1])}`;
  return null;
}

/** Stable short hash for rows that come without a reference ID. */
export function hashRef(parts: (string | number | null | undefined)[]): string {
  const s = parts.map((p) => String(p ?? "")).join("|");
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  return `h${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
}
