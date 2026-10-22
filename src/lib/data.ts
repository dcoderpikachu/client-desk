import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFx, type Fx, type FxRow } from "@/lib/fx";
import {
  DEFAULT_THRESHOLDS,
  type ActionItem,
  type Brand,
  type Charge,
  type Client,
  type Contact,
  type Earning,
  type Engagement,
  type Invoice,
  type Note,
  type Payout,
  type Rating,
  type Thresholds,
  type Touchpoint,
} from "@/lib/types";

export type Data = {
  clients: Client[];
  brands: Brand[];
  contacts: Contact[];
  engagements: Engagement[];
  touchpoints: Touchpoint[];
  actionItems: ActionItem[];
  notes: Note[];
  ratings: Rating[];
  invoices: Invoice[];
  payouts: Payout[];
  earnings: Earning[];
  charges: Charge[];
  fx: Fx;
  thresholds: Thresholds;
};

const PAGE = 1000;

// PostgREST caps responses at 1,000 rows, so read every table in pages.
async function all<T>(supabase: SupabaseClient, table: string, order: string, tiebreak = "id"): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(order, { ascending: true })
      .order(tiebreak, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

const n = (v: unknown): number => (v === null || v === undefined || v === "" ? 0 : Number(v));
const nn = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));

export async function loadData(supabase: SupabaseClient): Promise<Data> {
  const [
    clients, brands, contacts, engagements, touchpoints, actionItems, notes, ratings,
    invoices, payouts, earnings, charges, fxRows, settings,
  ] = await Promise.all([
    all<Client>(supabase, "clients", "name"),
    all<Brand>(supabase, "brands", "name"),
    all<Contact>(supabase, "contacts", "name"),
    all<Engagement>(supabase, "engagements", "created_at"),
    all<Touchpoint>(supabase, "touchpoints", "occurred_on"),
    all<ActionItem>(supabase, "action_items", "created_at"),
    all<Note>(supabase, "notes", "created_at"),
    all<Rating>(supabase, "health_ratings", "created_at"),
    all<Invoice>(supabase, "invoices", "issued_on"),
    all<Payout>(supabase, "payouts", "paid_on"),
    all<Earning>(supabase, "upwork_earnings", "period_end"),
    all<Charge>(supabase, "upwork_charges", "occurred_on"),
    all<FxRow>(supabase, "fx_rates", "day", "currency"),
    supabase.from("settings").select("key, value"),
  ]);

  return normalize({
    clients, brands, contacts, engagements, touchpoints, action_items: actionItems, notes, health_ratings: ratings,
    invoices, payouts, upwork_earnings: earnings, upwork_charges: charges, fx_rates: fxRows, settings: settings.data ?? [],
  });
}

export type RawData = {
  clients: Client[];
  brands: Brand[];
  contacts: Contact[];
  engagements: Engagement[];
  touchpoints: Touchpoint[];
  action_items: ActionItem[];
  notes: Note[];
  health_ratings: Rating[];
  invoices: Invoice[];
  payouts: Payout[];
  upwork_earnings: Earning[];
  upwork_charges: Charge[];
  fx_rates: FxRow[];
  settings: { key: string; value: unknown }[];
};

/** Numbers come back from PostgREST as strings for numeric columns; coerce them once here. */
export function normalize(raw: RawData): Data {
  const {
    clients, brands, contacts, engagements, touchpoints, action_items: actionItems, notes, health_ratings: ratings,
    invoices, payouts, upwork_earnings: earnings, upwork_charges: charges, fx_rates: fxRows, settings,
  } = raw;
  const thresholdsRow = settings.find((s) => s.key === "thresholds") as { value: Partial<Thresholds> } | undefined;
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

  return {
    clients: [...clients]
      .sort(byName)
      .map((c) => ({ ...c, payment_terms_days: n(c.payment_terms_days), cadence_days: n(c.cadence_days) || 14 })),
    brands,
    contacts,
    engagements: engagements.map((e) => ({
      ...e,
      monthly_value: nn(e.monthly_value),
      hourly_rate: nn(e.hourly_rate),
      total_value: nn(e.total_value),
    })),
    touchpoints,
    actionItems,
    notes,
    ratings,
    invoices: invoices.map((i) => ({ ...i, amount: n(i.amount), amount_received_inr: nn(i.amount_received_inr) })),
    payouts: payouts.map((p) => ({ ...p, usd_withdrawn: n(p.usd_withdrawn), inr_received: nn(p.inr_received) })),
    earnings: earnings.map((e) => ({
      ...e,
      hours: nn(e.hours),
      gross_usd: n(e.gross_usd),
      fee_usd: n(e.fee_usd),
      net_usd: n(e.net_usd),
    })),
    charges: charges.map((c) => ({ ...c, amount_usd: n(c.amount_usd) })),
    fx: buildFx(fxRows.map((r) => ({ ...r, per_usd: n(r.per_usd) }))),
    thresholds: { ...DEFAULT_THRESHOLDS, ...(thresholdsRow?.value ?? {}) },
  };
}
