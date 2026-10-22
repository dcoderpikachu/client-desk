import { findColumn, hashRef, parseAmount, parseCsv, parseDate } from "@/lib/csv";

// Reads Upwork's "Transaction history" CSV. Upwork has changed the export's columns over
// the years, so columns are found by name and transaction types by keyword.

export type UpKind =
  | "hourly"
  | "milestone"
  | "bonus"
  | "fee"
  | "withdrawal"
  | "withdrawal_fee"
  | "membership"
  | "connects"
  | "other";

export type UpRow = {
  ref: string;
  date: string;
  kind: UpKind;
  amount: number;
  team: string | null;
  description: string;
  periodStart: string | null;
  periodEnd: string | null;
  hours: number | null;
  feeTargetRef: string | null;
};

export type UpParse = {
  rows: UpRow[];
  skipped: number;
  columns: { date: string | null; type: string | null; description: string | null; amount: string | null; ref: string | null; team: string | null };
  error?: string;
};

function classify(type: string, desc: string, amount: number, team: string | null): UpKind {
  const t = `${type} ${desc}`.toLowerCase();
  if (/withdraw\w* fee|wire fee|transfer fee|payment method fee|processing fee/.test(t)) return "withdrawal_fee";
  if (/service fee|marketplace fee|freelancer fee/.test(t)) return "fee";
  if (/withdraw|payout|transfer to/.test(t)) return "withdrawal";
  if (/membership|freelancer plus|plus plan/.test(t)) return "membership";
  if (/connects/.test(t)) return "connects";
  if (/hourly/.test(t)) return "hourly";
  if (/bonus/.test(t)) return "bonus";
  if (/fixed|milestone/.test(t)) return "milestone";
  if (/payment|invoice/.test(t) && amount > 0 && team) return "milestone";
  return "other";
}

function period(desc: string): { start: string | null; end: string | null } {
  const range =
    desc.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{4})/) ??
    desc.match(/(\d{4}-\d{2}-\d{2})\s*[-–]\s*(\d{4}-\d{2}-\d{2})/) ??
    desc.match(/([A-Z][a-z]{2} \d{1,2}, \d{4})\s*[-–]\s*([A-Z][a-z]{2} \d{1,2}, \d{4})/);
  if (!range) return { start: null, end: null };
  return { start: parseDate(range[1], "mdy"), end: parseDate(range[2], "mdy") };
}

function hoursFrom(desc: string): number | null {
  const hm = desc.match(/(\d+):(\d{2})\s*(hrs?|hours)/i);
  if (hm) return Number(hm[1]) + Number(hm[2]) / 60;
  const dec = desc.match(/(\d+(?:\.\d+)?)\s*(hrs?|hours)\b/i);
  return dec ? Number(dec[1]) : null;
}

export function parseUpwork(text: string): UpParse {
  const sheet = parseCsv(text);
  const h = sheet.headers;
  const columns = {
    date: findColumn(h, [/^date$/i, /date/i], [/period|due/i]),
    type: findColumn(h, [/^type$/i, /transaction type/i, /type/i]),
    description: findColumn(h, [/^description$/i, /summary/i, /description|memo|details/i]),
    amount: findColumn(h, [/^amount$/i, /^amount\s*\(?(usd|\$)\)?$/i, /amount in usd/i, /amount/i], [/local/i, /balance/i]),
    ref: findColumn(h, [/^ref\.?\s*id$/i, /transaction id/i, /reference|ref/i]),
    team: findColumn(h, [/^team$/i, /^client$/i, /client name/i, /company/i, /team/i]),
  };
  if (!columns.date || !columns.amount) {
    return { rows: [], skipped: sheet.rows.length, columns, error: "This doesn't look like an Upwork transaction history export. It needs at least a Date and an Amount column." };
  }

  const rows: UpRow[] = [];
  let skipped = 0;
  for (const r of sheet.rows) {
    const date = parseDate(r[columns.date], "mdy");
    const amount = parseAmount(r[columns.amount]);
    if (!date || amount === null || amount === 0) {
      skipped += 1;
      continue;
    }
    const type = columns.type ? String(r[columns.type] ?? "") : "";
    const description = columns.description ? String(r[columns.description] ?? "").trim() : "";
    const teamRaw = columns.team ? String(r[columns.team] ?? "").trim() : "";
    const team = teamRaw || null;
    const kind = classify(type, description, amount, team);
    const p = period(description);
    const refRaw = columns.ref ? String(r[columns.ref] ?? "").trim() : "";
    rows.push({
      ref: refRaw ? `up:${refRaw}` : `up:${hashRef([date, type, description, amount, team])}`,
      date,
      kind,
      amount,
      team,
      description: description || type,
      periodStart: p.start,
      periodEnd: p.end,
      hours: kind === "hourly" ? hoursFrom(description) : null,
      feeTargetRef: kind === "fee" ? (description.match(/ref\.?\s*id[:\s#]*(\d+)/i)?.[1] ?? null) : null,
    });
  }
  return { rows, skipped, columns };
}

export function teamsOf(rows: UpRow[]): string[] {
  return Array.from(
    new Set(rows.filter((r) => ["hourly", "milestone", "bonus", "fee"].includes(r.kind) && r.team).map((r) => r.team as string)),
  ).sort();
}
