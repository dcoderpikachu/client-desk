"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findColumn, parseAmount, parseCsv, parseDate } from "@/lib/csv";
import { addDays } from "@/lib/dates";
import { ALLOWED_EMAIL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { parseUpwork, teamsOf, type UpRow } from "@/lib/upwork";

async function db() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || (data.user.email ?? "").toLowerCase() !== ALLOWED_EMAIL) redirect("/login");
  return supabase;
}

// ---------------------------------------------------------------------------
// Direct invoices: one-time import of past invoices
// ---------------------------------------------------------------------------

export type InvoiceImportState = { ok?: boolean; message?: string; lines?: string[] };

export async function importInvoices(_: InvoiceImportState, fd: FormData): Promise<InvoiceImportState> {
  const supabase = await db();
  const text = String(fd.get("csv") ?? "");
  const createMissing = fd.get("create_missing") === "on";
  if (!text.trim()) return { ok: false, message: "Choose a CSV file first." };

  const sheet = parseCsv(text);
  const h = sheet.headers;
  const col = {
    number: findColumn(h, [/^invoice\s*(no\.?|number|#)$/i, /^number$/i, /^no\.?$/i, /invoice/i, /reference/i], [/date|amount|status|due/i]),
    client: findColumn(h, [/^client$/i, /customer/i, /bill(ed)?\s*to/i, /client/i, /company/i]),
    currency: findColumn(h, [/currency/i]),
    amount: findColumn(h, [/^amount$/i, /^total$/i, /total/i, /amount/i], [/inr|received|paid|tax|vat/i]),
    issued: findColumn(h, [/issue/i, /invoice date/i, /^date$/i, /created/i], [/due|paid/i]),
    due: findColumn(h, [/due/i]),
    status: findColumn(h, [/status/i]),
    paid: findColumn(h, [/paid\s*(on|date)/i, /payment date/i, /^paid$/i], [/amount|inr/i]),
    inr: findColumn(h, [/inr/i, /received/i]),
  };
  const missing = (["number", "client", "amount", "issued"] as const).filter((k) => !col[k]);
  if (missing.length) {
    return {
      ok: false,
      message: `Couldn't find these columns: ${missing.join(", ")}. The file needs an invoice number, client, amount and issue date.`,
      lines: [`Columns found: ${h.join(", ") || "none"}`],
    };
  }

  const { data: clientRows } = await supabase.from("clients").select("id, name, payment_terms_days, billing_currency");
  const byName = new Map((clientRows ?? []).map((c) => [String(c.name).toLowerCase().trim(), c]));
  const lines: string[] = [];
  let created = 0;
  const records: Record<string, unknown>[] = [];

  for (const [idx, r] of sheet.rows.entries()) {
    const line = idx + 2;
    const number = String(r[col.number!] ?? "").trim();
    const clientName = String(r[col.client!] ?? "").trim();
    const amount = parseAmount(r[col.amount!]);
    const issued = parseDate(r[col.issued!]);
    if (!number || !clientName || amount === null || !issued) {
      lines.push(`Row ${line}: skipped, missing number, client, amount or date.`);
      continue;
    }
    let client = byName.get(clientName.toLowerCase());
    if (!client && createMissing) {
      const { data: nc, error } = await supabase
        .from("clients")
        .insert({ name: clientName, client_since: issued, billing_currency: String(r[col.currency ?? ""] ?? "USD").trim().toUpperCase() || "USD" })
        .select("id, name, payment_terms_days, billing_currency")
        .single();
      if (error || !nc) {
        lines.push(`Row ${line}: couldn't create client ${clientName}.`);
        continue;
      }
      client = nc;
      byName.set(clientName.toLowerCase(), nc);
      created += 1;
    }
    if (!client) {
      lines.push(`Row ${line}: no client called "${clientName}". Add them first or tick "create missing clients".`);
      continue;
    }
    const statusRaw = String(r[col.status ?? ""] ?? "").toLowerCase();
    const paidOn = parseDate(r[col.paid ?? ""]);
    const status = /void|cancel/.test(statusRaw) ? "void" : /part/.test(statusRaw) ? "partially_paid" : paidOn || /paid|settled|received/.test(statusRaw) ? "paid" : "sent";
    const currency = (String(r[col.currency ?? ""] ?? "").trim().toUpperCase() || client.billing_currency || "USD").slice(0, 3);
    records.push({
      client_id: client.id,
      number,
      currency,
      amount: Math.abs(amount),
      issued_on: issued,
      due_on: parseDate(r[col.due ?? ""]) ?? addDays(issued, Number(client.payment_terms_days ?? 14)),
      status,
      paid_on: status === "paid" ? (paidOn ?? issued) : null,
      amount_received_inr: status === "paid" ? parseAmount(r[col.inr ?? ""]) : null,
    });
  }

  let inserted = 0;
  if (records.length) {
    const { data, error } = await supabase.from("invoices").upsert(records, { onConflict: "number", ignoreDuplicates: true }).select("id");
    if (error) return { ok: false, message: error.message, lines };
    inserted = data?.length ?? 0;
  }
  const dupes = records.length - inserted;
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: `Imported ${inserted} invoice${inserted === 1 ? "" : "s"}${dupes ? `, skipped ${dupes} already here` : ""}${created ? `, created ${created} client${created === 1 ? "" : "s"}` : ""}.`,
    lines,
  };
}

// ---------------------------------------------------------------------------
// Upwork: monthly transaction history upload
// ---------------------------------------------------------------------------

export type UpworkState = {
  step: "upload" | "preview" | "done";
  error?: string;
  csv?: string;
  summary?: { kind: string; count: number; total: number }[];
  range?: { from: string; to: string };
  teams?: { name: string; suggested: string }[];
  clients?: { id: string; name: string }[];
  result?: string[];
};

const KIND_LABEL: Record<string, string> = {
  hourly: "Hourly earnings",
  milestone: "Fixed-price payments",
  bonus: "Bonuses",
  fee: "Service fees",
  withdrawal: "Withdrawals",
  withdrawal_fee: "Withdrawal fees",
  membership: "Membership",
  connects: "Connects",
  other: "Other",
};

export async function previewUpwork(_: UpworkState, fd: FormData): Promise<UpworkState> {
  const supabase = await db();
  const csv = String(fd.get("csv") ?? "");
  if (!csv.trim()) return { step: "upload", error: "Choose the CSV you downloaded from Upwork." };
  const parsed = parseUpwork(csv);
  if (parsed.error) return { step: "upload", error: parsed.error };
  if (!parsed.rows.length) return { step: "upload", error: "No transactions found in that file." };

  const kinds = new Map<string, { count: number; total: number }>();
  for (const r of parsed.rows) {
    const k = kinds.get(r.kind) ?? { count: 0, total: 0 };
    k.count += 1;
    k.total += r.amount;
    kinds.set(r.kind, k);
  }
  const { data: clientRows } = await supabase.from("clients").select("id, name, upwork_name").neq("status", "churned").order("name");
  const clients = (clientRows ?? []).map((c) => ({ id: c.id as string, name: c.name as string, upwork: (c.upwork_name as string | null) ?? "" }));
  const teams = teamsOf(parsed.rows).map((name) => {
    const n = name.toLowerCase();
    const hit = clients.find((c) => c.upwork.toLowerCase() === n) ?? clients.find((c) => c.name.toLowerCase() === n);
    return { name, suggested: hit?.id ?? "new" };
  });
  const dates = parsed.rows.map((r) => r.date).sort();

  return {
    step: "preview",
    csv,
    summary: [...kinds.entries()].map(([kind, v]) => ({ kind: KIND_LABEL[kind] ?? kind, count: v.count, total: v.total })),
    range: { from: dates[0], to: dates[dates.length - 1] },
    teams,
    clients: clients.map(({ id, name }) => ({ id, name })),
    result: parsed.skipped ? [`${parsed.skipped} rows had no date or amount and will be skipped.`] : [],
  };
}

export async function importUpwork(_: UpworkState, fd: FormData): Promise<UpworkState> {
  const supabase = await db();
  const csv = String(fd.get("csv") ?? "");
  const parsed = parseUpwork(csv);
  if (parsed.error || !parsed.rows.length) return { step: "upload", error: parsed.error ?? "No transactions found." };

  const teamNames = teamsOf(parsed.rows);
  const teamClient = new Map<string, string>();
  const log: string[] = [];

  // 1. Map Upwork team names to clients, creating any new ones.
  const { data: engRows } = await supabase.from("engagements").select("id, client_id, type, hourly_rate, channel, status").eq("channel", "upwork");
  const engagements = engRows ?? [];
  for (const [i, name] of teamNames.entries()) {
    const choice = String(fd.get(`map_${i}`) ?? "new");
    if (choice === "skip") continue;
    if (choice === "new") {
      const hasHourly = parsed.rows.some((r) => r.team === name && r.kind === "hourly");
      const first = parsed.rows.filter((r) => r.team === name).map((r) => r.date).sort()[0];
      const { data: nc, error } = await supabase
        .from("clients")
        .insert({ name, upwork_name: name, billing_currency: "USD", payment_terms_days: 0, client_since: first })
        .select("id")
        .single();
      if (error || !nc) {
        log.push(`Couldn't create a client for ${name}: ${error?.message}`);
        continue;
      }
      const { data: ne } = await supabase
        .from("engagements")
        .insert({ client_id: nc.id, type: hasHourly ? "hourly" : "fixed", channel: "upwork", currency: "USD", start_date: first, title: "Upwork contract" })
        .select("id, client_id, type, hourly_rate, channel, status")
        .single();
      if (ne) engagements.push(ne);
      teamClient.set(name, nc.id as string);
      log.push(`Created client ${name}. Add their hourly rate on the client page.`);
    } else {
      teamClient.set(name, choice);
      await supabase.from("clients").update({ upwork_name: name }).eq("id", choice).is("upwork_name", null);
    }
  }

  const engFor = (clientId: string, kind: UpRow["kind"]) => {
    const mine = engagements.filter((e) => e.client_id === clientId && e.status === "active");
    return mine.find((e) => (kind === "hourly" ? e.type === "hourly" : e.type === "fixed")) ?? mine[0] ?? null;
  };

  // 2. Earnings.
  const earningRows = parsed.rows.filter((r) => ["hourly", "milestone", "bonus"].includes(r.kind) && r.team && teamClient.has(r.team));
  const earnings = earningRows.map((r) => {
    const clientId = teamClient.get(r.team as string) as string;
    const eng = engFor(clientId, r.kind);
    const rate = eng?.hourly_rate ? Number(eng.hourly_rate) : null;
    return {
      client_id: clientId,
      engagement_id: eng?.id ?? null,
      kind: r.kind,
      period_start: r.kind === "hourly" ? (r.periodStart ?? addDays(r.periodEnd ?? r.date, -6)) : null,
      period_end: r.kind === "hourly" ? (r.periodEnd ?? r.date) : r.date,
      hours: r.hours ?? (r.kind === "hourly" && rate ? Math.round((r.amount / rate) * 100) / 100 : null),
      gross_usd: r.amount,
      fee_usd: 0,
      status: "available",
      source_ref: r.ref,
      txn_date: r.date,
      description: r.description.slice(0, 300),
    };
  });
  let newEarnings = 0;
  if (earnings.length) {
    const { data, error } = await supabase.from("upwork_earnings").upsert(earnings, { onConflict: "source_ref", ignoreDuplicates: true }).select("id");
    if (error) return { step: "upload", error: `Earnings: ${error.message}` };
    newEarnings = data?.length ?? 0;
  }

  // 3. Service fees: attach each one to the earning it was charged on.
  const fees = parsed.rows.filter((r) => r.kind === "fee");
  let feesApplied = 0;
  const unmatchedFees: UpRow[] = [];
  const usedTargets = new Set<string>();
  for (const f of fees) {
    let target: string | null = null;
    if (f.feeTargetRef) {
      const ref = `up:${f.feeTargetRef}`;
      if (earningRows.some((e) => e.ref === ref)) target = ref;
      else {
        const { data: hit } = await supabase.from("upwork_earnings").select("source_ref").eq("source_ref", ref).maybeSingle();
        if (hit) target = ref;
      }
    }
    if (!target) {
      const candidate = earningRows.find(
        (e) => e.team === f.team && e.date === f.date && !usedTargets.has(e.ref) && Math.abs(Math.abs(f.amount) / e.amount - 0.1) < 0.06,
      ) ?? earningRows.find((e) => e.team === f.team && e.date === f.date && !usedTargets.has(e.ref));
      if (candidate) target = candidate.ref;
    }
    if (!target) {
      unmatchedFees.push(f);
      continue;
    }
    usedTargets.add(target);
    const { data } = await supabase
      .from("upwork_earnings")
      .update({ fee_usd: Math.abs(f.amount), fee_ref: f.ref })
      .eq("source_ref", target)
      .is("fee_ref", null)
      .select("id");
    if (data?.length) feesApplied += 1;
  }

  // 4. Account charges (and any fee we couldn't match to an earning).
  const chargeKinds: Record<string, string> = { membership: "membership", connects: "connects", withdrawal_fee: "withdrawal_fee", other: "other" };
  const charges = [
    ...parsed.rows.filter((r) => r.kind in chargeKinds && r.kind !== "other"),
    ...parsed.rows.filter((r) => r.kind === "other" && r.amount < 0),
    ...unmatchedFees,
  ].map((r) => ({
    occurred_on: r.date,
    kind: r.kind === "fee" ? "other" : chargeKinds[r.kind],
    amount_usd: -r.amount,
    description: (r.kind === "fee" ? `Service fee (no matching earning): ${r.description}` : r.description).slice(0, 300),
    source_ref: r.ref,
  }));
  let newCharges = 0;
  if (charges.length) {
    const { data, error } = await supabase.from("upwork_charges").upsert(charges, { onConflict: "source_ref", ignoreDuplicates: true }).select("id");
    if (error) return { step: "upload", error: `Charges: ${error.message}` };
    newCharges = data?.length ?? 0;
  }

  // 5. Withdrawals become payouts.
  const payouts = parsed.rows
    .filter((r) => r.kind === "withdrawal")
    .map((r) => ({ paid_on: r.date, usd_withdrawn: Math.abs(r.amount), source_ref: r.ref, note: r.description.slice(0, 300) }));
  let newPayouts = 0;
  if (payouts.length) {
    const { data, error } = await supabase.from("payouts").upsert(payouts, { onConflict: "source_ref", ignoreDuplicates: true }).select("id");
    if (error) return { step: "upload", error: `Payouts: ${error.message}` };
    newPayouts = data?.length ?? 0;
  }

  // 6. Settle: each earning goes into the first withdrawal on or after it cleared
  //    (Upwork holds funds about 5 days); each charge into the first withdrawal after it.
  const linked = await settle(supabase);

  const positiveOther = parsed.rows.filter((r) => r.kind === "other" && r.amount > 0).length;
  revalidatePath("/", "layout");
  return {
    step: "done",
    result: [
      `${newEarnings} new earnings, ${feesApplied} service fees matched.`,
      `${newCharges} account charges, ${newPayouts} withdrawals.`,
      ...(linked ? [`${linked} earnings and charges matched to their payout.`] : []),
      ...(earningRows.length < parsed.rows.filter((r) => ["hourly", "milestone", "bonus"].includes(r.kind)).length
        ? ["Some earnings had no client and were skipped."]
        : []),
      ...(positiveOther ? [`${positiveOther} credits (refunds or adjustments) were left out. Tell me if they should count.`] : []),
      ...log,
    ],
  };
}

async function settle(supabase: Awaited<ReturnType<typeof createClient>>): Promise<number> {
  const [{ data: payouts }, { data: earnings }, { data: charges }] = await Promise.all([
    supabase.from("payouts").select("id, paid_on").order("paid_on"),
    supabase.from("upwork_earnings").select("id, period_end, txn_date").is("payout_id", null),
    supabase.from("upwork_charges").select("id, occurred_on").is("payout_id", null),
  ]);
  if (!payouts?.length) return 0;
  let count = 0;
  const firstPayoutOnOrAfter = (day: string) => payouts.find((p) => p.paid_on >= day)?.id ?? null;

  const byPayout = new Map<string, { e: string[]; c: string[] }>();
  for (const e of earnings ?? []) {
    const cleared = addDays((e.txn_date as string | null) ?? (e.period_end as string), e.txn_date ? 5 : 6);
    const p = firstPayoutOnOrAfter(cleared);
    if (!p) continue;
    (byPayout.get(p) ?? byPayout.set(p, { e: [], c: [] }).get(p)!).e.push(e.id as string);
  }
  for (const c of charges ?? []) {
    const p = firstPayoutOnOrAfter(c.occurred_on as string);
    if (!p) continue;
    (byPayout.get(p) ?? byPayout.set(p, { e: [], c: [] }).get(p)!).c.push(c.id as string);
  }
  for (const [pid, ids] of byPayout) {
    if (ids.e.length) {
      await supabase.from("upwork_earnings").update({ payout_id: pid, status: "withdrawn" }).in("id", ids.e);
      count += ids.e.length;
    }
    if (ids.c.length) {
      await supabase.from("upwork_charges").update({ payout_id: pid }).in("id", ids.c);
      count += ids.c.length;
    }
  }
  return count;
}
