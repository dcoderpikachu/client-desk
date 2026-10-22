import type { Data } from "@/lib/data";
import {
  addDays,
  addMonths,
  dayMonth,
  diffDays,
  monthKey,
  monthLong,
  monthShort,
  monthStart,
} from "@/lib/dates";
import { perUsd, toUsd, usdToInr, type Fx } from "@/lib/fx";
import { hours as fmtHours, inr, money, pct, usd } from "@/lib/format";
import type {
  ActionItem,
  Brand,
  Channel,
  Client,
  Contact,
  Earning,
  Engagement,
  Invoice,
  Rating,
  Thresholds,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export type Level = "good" | "watch" | "risk";
export const LEVEL_RANK: Record<Level, number> = { good: 0, watch: 1, risk: 2 };
export const LEVEL_LABEL: Record<Level, string> = { good: "Healthy", watch: "Watch", risk: "At risk" };
export const RATING_LEVEL: Record<Rating["rating"], Level> = { green: "good", amber: "watch", red: "risk" };

export type SignalKey = "payment" | "trend" | "contact" | "rating";
export type Signal = { key: SignalKey; title: string; level: Level; detail: string; short: string };

export type Money = { usd: number; inr: number };
const zero = (): Money => ({ usd: 0, inr: 0 });
const add = (a: Money, b: Money): Money => ({ usd: a.usd + b.usd, inr: a.inr + b.inr });

export function cadenceText(days: number): string {
  if (days === 7) return "week";
  if (days % 7 === 0) return `${days / 7} weeks`;
  if (days === 30 || days === 31) return "month";
  return `${days} days`;
}

function spanText(days: number): string {
  if (days >= 14 && days % 7 <= 1) return `${Math.floor(days / 7)} weeks`;
  return `${days} days`;
}

const isUnpaid = (i: Invoice) => i.status === "sent" || i.status === "partially_paid";

// ---------------------------------------------------------------------------
// Money items: one list for revenue, one for collections
// ---------------------------------------------------------------------------

export type MoneyItem = { client_id: string; date: string; usd: number; inr: number; channel: Channel };

export function revenueItems(d: Data): MoneyItem[] {
  const items: MoneyItem[] = [];
  for (const i of d.invoices) {
    if (i.status === "void") continue;
    const u = toUsd(d.fx, i.amount, i.currency, i.issued_on);
    items.push({ client_id: i.client_id, date: i.issued_on, usd: u, inr: usdToInr(d.fx, u, i.issued_on), channel: "direct" });
  }
  for (const e of d.earnings) {
    items.push({ client_id: e.client_id, date: e.period_end, usd: e.net_usd, inr: usdToInr(d.fx, e.net_usd, e.period_end), channel: "upwork" });
  }
  return items;
}

export function collectedItems(d: Data): MoneyItem[] {
  const items: MoneyItem[] = [];
  for (const i of d.invoices) {
    if (i.status !== "paid" || !i.paid_on) continue;
    const u = toUsd(d.fx, i.amount, i.currency, i.paid_on);
    items.push({
      client_id: i.client_id,
      date: i.paid_on,
      usd: u,
      inr: i.amount_received_inr ?? usdToInr(d.fx, u, i.paid_on),
      channel: "direct",
    });
  }
  const payouts = new Map(d.payouts.map((p) => [p.id, p]));
  for (const e of d.earnings) {
    const p = e.payout_id ? payouts.get(e.payout_id) : undefined;
    if (!p) continue;
    const rate = p.inr_received && p.usd_withdrawn > 0 ? p.inr_received / p.usd_withdrawn : perUsd(d.fx, "INR", p.paid_on);
    items.push({ client_id: e.client_id, date: p.paid_on, usd: e.net_usd, inr: e.net_usd * rate, channel: "upwork" });
  }
  return items;
}

function sumWhere(items: MoneyItem[], pred: (m: MoneyItem) => boolean): Money {
  return items.reduce((acc, m) => (pred(m) ? { usd: acc.usd + m.usd, inr: acc.inr + m.inr } : acc), zero());
}

// ---------------------------------------------------------------------------
// Per-client view
// ---------------------------------------------------------------------------

export type ClientView = {
  client: Client;
  brands: Brand[];
  contacts: Contact[];
  engagements: Engagement[];
  active: Engagement[];
  channels: Channel[];
  signals: Signal[];
  health: Level;
  healthReason: string;
  lastContact: string | null;
  contactDays: number;
  nextDue: string;
  overdueDays: number;
  rating: Rating | null;
  ratingAgeDays: number | null;
  openItems: ActionItem[];
  outstanding: Money;
  maxLateDays: number;
  outstandingNote: { text: string; late: boolean };
  monthly: { usd: number | null; sub: string };
  engagementSummary: string;
  revenue12: Money;
  lifetime: Money;
  daysToPay: number | null;
  netPerHour: number | null;
  feesThisFy: number;
  isUpworkHourly: boolean;
  trend: { recent: number; priorAvg: number; unit: "h" | "usd"; drop: number } | null;
};

function fiscalYearStart(today: string): string {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  return `${m >= 4 ? y : y - 1}-04-01`;
}

export function buildClientViews(d: Data, today: string): ClientView[] {
  const t = d.thresholds;
  const rev = revenueItems(d);
  const fyStart = fiscalYearStart(today);
  const lastMonthStart = addMonths(monthStart(today), -1);

  return d.clients.map((client) => {
    const cid = client.id;
    const brands = d.brands.filter((b) => b.client_id === cid);
    const contacts = d.contacts
      .filter((c) => c.client_id === cid)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
    const engagements = d.engagements.filter((e) => e.client_id === cid);
    const active = engagements.filter((e) => e.status === "active" && (!e.end_date || e.end_date >= today));
    const invoices = d.invoices.filter((i) => i.client_id === cid);
    const earnings = d.earnings.filter((e) => e.client_id === cid);
    const touchpoints = d.touchpoints.filter((x) => x.client_id === cid);
    const ratings = d.ratings.filter((r) => r.client_id === cid).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const openItems = d.actionItems
      .filter((a) => a.client_id === cid && !a.done_at)
      .sort((a, b) => (a.due_on ?? "9999") < (b.due_on ?? "9999") ? -1 : 1);

    const channels = Array.from(
      new Set<Channel>([
        ...engagements.map((e) => e.channel),
        ...(invoices.length ? (["direct"] as Channel[]) : []),
        ...(earnings.length ? (["upwork"] as Channel[]) : []),
      ]),
    ).sort() as Channel[];

    const signals: Signal[] = [];
    const paused = client.status !== "active";

    // Payment (direct clients) ------------------------------------------
    const unpaid = invoices.filter(isUnpaid);
    let maxLateDays = 0;
    let worstInvoice: Invoice | null = null;
    for (const i of unpaid) {
      const late = diffDays(i.due_on, today);
      if (late > maxLateDays) {
        maxLateDays = late;
        worstInvoice = i;
      }
    }
    if (invoices.length || active.some((e) => e.channel === "direct")) {
      const level: Level = maxLateDays >= t.payment_red_days ? "risk" : maxLateDays >= t.payment_amber_days ? "watch" : "good";
      signals.push({
        key: "payment",
        title: "Payment",
        level,
        detail: worstInvoice && maxLateDays > 0
          ? `Invoice ${worstInvoice.number} is ${maxLateDays} days overdue.`
          : unpaid.length
            ? `${unpaid.length} invoice${unpaid.length > 1 ? "s" : ""} open, none overdue.`
            : "Nothing outstanding.",
        short: worstInvoice && maxLateDays > 0 ? `Invoice ${maxLateDays} days late` : "Paying on time",
      });
    }

    // Billing trend (Upwork hourly clients) -----------------------------
    const hourly = earnings.filter((e) => e.kind === "hourly");
    const isUpworkHourly = active.some((e) => e.channel === "upwork" && e.type === "hourly");
    let trend: ClientView["trend"] = null;
    if (!paused && isUpworkHourly && hourly.length) {
      const recentFrom = addDays(today, -28);
      const priorFrom = addDays(today, -84);
      const recentRows = hourly.filter((e) => e.period_end > recentFrom && e.period_end <= today);
      const priorRows = hourly.filter((e) => e.period_end > priorFrom && e.period_end <= recentFrom);
      const useHours = [...recentRows, ...priorRows].every((e) => e.hours !== null);
      const val = (e: Earning) => (useHours ? Number(e.hours) : e.net_usd);
      const recent = recentRows.reduce((s, e) => s + val(e), 0);
      const priorAvg = priorRows.reduce((s, e) => s + val(e), 0) / 2;
      const lastEnd = hourly.reduce((m, e) => (e.period_end > m ? e.period_end : m), "");
      const quietDays = lastEnd ? diffDays(lastEnd, today) : 999;
      const quiet = quietDays > t.trend_quiet_days + 7;
      const fmt = (v: number) => (useHours ? fmtHours(v) : usd(v));
      if (priorAvg > 0 || recent > 0 || quiet) {
        const drop = priorAvg > 0 ? Math.max(0, 1 - recent / priorAvg) : 0;
        trend = { recent, priorAvg, unit: useHours ? "h" : "usd", drop };
        const level: Level = quiet || drop >= t.trend_red_drop ? "risk" : drop >= t.trend_amber_drop ? "watch" : "good";
        signals.push({
          key: "trend",
          title: "Billing trend",
          level,
          detail: quiet
            ? `Nothing billed on Upwork in ${quietDays} days.`
            : level === "good"
              ? `${fmt(recent)} in the last 4 weeks, in line with the 8 weeks before.`
              : `${fmt(recent)} in the last 4 weeks. The 8 weeks before averaged ${fmt(priorAvg)} per 4 weeks.`,
          short: quiet ? `Nothing billed in ${spanText(quietDays)}` : level === "good" ? "Billing steady" : `${useHours ? "Hours" : "Billing"} down ${pct(drop)}`,
        });
      }
    }

    // Contact ------------------------------------------------------------
    const lastContact = touchpoints.reduce<string | null>((m, x) => (!m || x.occurred_on > m ? x.occurred_on : m), null);
    const base = lastContact ?? client.client_since ?? client.created_at.slice(0, 10);
    const contactDays = Math.max(0, diffDays(base, today));
    const cadence = client.cadence_days;
    const nextDue = addDays(base, cadence);
    const overdueDays = Math.max(0, diffDays(nextDue, today));
    if (!paused) {
      const level: Level = contactDays <= cadence ? "good" : contactDays < cadence * 2 ? "watch" : "risk";
      signals.push({
        key: "contact",
        title: "Contact",
        level,
        detail: !lastContact
          ? `No calls logged yet. Your cadence is every ${cadenceText(cadence)}.`
          : level === "good"
            ? `Last call ${contactDays === 0 ? "today" : `${contactDays} days ago`}. Your cadence is every ${cadenceText(cadence)}.`
            : `No call in ${spanText(contactDays)}. Your cadence is every ${cadenceText(cadence)}.`,
        short: !lastContact ? "No calls logged" : level === "good" ? "In touch" : `No call in ${spanText(contactDays)}`,
      });
    }

    // KT's rating --------------------------------------------------------
    const rating = ratings[0] ?? null;
    const ratingAgeDays = rating ? diffDays(rating.created_at.slice(0, 10), today) : null;
    if (rating) {
      const level = RATING_LEVEL[rating.rating];
      signals.push({
        key: "rating",
        title: "Your rating",
        level,
        detail: `Set ${dayMonth(rating.created_at.slice(0, 10))}${rating.reason ? `: "${rating.reason}"` : "."}`,
        short: level === "good" ? "You rated them green" : `You rated them ${rating.rating}`,
      });
    }

    const health = signals.reduce<Level>((w, s) => (LEVEL_RANK[s.level] > LEVEL_RANK[w] ? s.level : w), "good");
    const worst = signals.find((s) => s.level === health && health !== "good");
    const healthReason = worst ? worst.short : "All signals green";

    // Outstanding ----------------------------------------------------------
    let outstanding = zero();
    for (const i of unpaid) {
      const u = toUsd(d.fx, i.amount, i.currency, today);
      outstanding = add(outstanding, { usd: u, inr: usdToInr(d.fx, u, today) });
    }
    const pendingUpwork = earnings.filter((e) => !e.payout_id).reduce((s, e) => s + e.net_usd, 0);
    outstanding = add(outstanding, { usd: pendingUpwork, inr: usdToInr(d.fx, pendingUpwork, today) });
    const nextOpen = unpaid.filter((i) => diffDays(i.due_on, today) <= 0).sort((a, b) => (a.due_on < b.due_on ? -1 : 1))[0];
    const outstandingNote =
      maxLateDays > 0
        ? { text: `${maxLateDays} days late`, late: true }
        : nextOpen
          ? { text: `due ${dayMonth(nextOpen.due_on)}`, late: false }
          : pendingUpwork > 0
            ? { text: "pending release", late: false }
            : { text: "all paid", late: false };

    // Monthly value ----------------------------------------------------------
    const retainers = active.filter((e) => e.type === "retainer" && e.monthly_value);
    let monthly: ClientView["monthly"] = { usd: null, sub: "" };
    if (retainers.length) {
      const u = retainers.reduce((s, e) => s + toUsd(d.fx, Number(e.monthly_value), e.currency, today), 0);
      const nonUsd = retainers.find((e) => e.currency !== "USD");
      monthly = {
        usd: u,
        sub: nonUsd && retainers.length === 1 ? `billed as ${money(Number(nonUsd.monthly_value), nonUsd.currency)}` : "per month",
      };
    } else if (active.some((e) => e.type === "hourly" && e.channel === "direct")) {
      const from = addMonths(monthStart(today), -3);
      const to = monthStart(today);
      const u = rev.filter((m) => m.client_id === cid && m.channel === "direct" && m.date >= from && m.date < to).reduce((s, m) => s + m.usd, 0) / 3;
      monthly = { usd: u, sub: "3-month average" };
    } else if (active.some((e) => e.channel === "upwork")) {
      const u = earnings.filter((e) => monthKey(e.period_end) === monthKey(lastMonthStart)).reduce((s, e) => s + e.net_usd, 0);
      monthly = { usd: u, sub: `net, ${monthLong(lastMonthStart)}` };
    } else if (active.some((e) => e.type === "fixed")) {
      const fixed = active.filter((e) => e.type === "fixed");
      const total = fixed.reduce((s, e) => s + toUsd(d.fx, Number(e.total_value ?? 0), e.currency, today), 0);
      const billed = invoices.filter((i) => i.status !== "void" && fixed.some((f) => f.id === i.engagement_id)).reduce((s, i) => s + toUsd(d.fx, i.amount, i.currency, i.issued_on), 0);
      monthly = { usd: total, sub: `${usd(billed)} billed so far` };
    }

    const engagementSummary =
      active
        .map((e) =>
          e.type === "retainer"
            ? "Retainer"
            : e.type === "hourly"
              ? `Hourly, ${money(Number(e.hourly_rate ?? 0), e.currency)} an hour`
              : e.channel === "upwork"
                ? "Fixed milestones"
                : "Fixed project",
        )
        .join(" + ") || "No active engagement";

    // Money stats ------------------------------------------------------------
    const mine = rev.filter((m) => m.client_id === cid);
    const lifetime = sumWhere(mine, () => true);
    const revenue12 = sumWhere(mine, (m) => m.date > addDays(today, -365));
    const paidRecent = invoices.filter((i) => i.status === "paid" && i.paid_on && i.paid_on > addDays(today, -365));
    const daysToPay = paidRecent.length
      ? Math.round(paidRecent.reduce((s, i) => s + diffDays(i.issued_on, i.paid_on as string), 0) / paidRecent.length)
      : null;
    const hourly90 = hourly.filter((e) => e.period_end > addDays(today, -90) && e.hours);
    const h90 = hourly90.reduce((s, e) => s + Number(e.hours), 0);
    const netPerHour = h90 > 0 ? hourly90.reduce((s, e) => s + e.net_usd, 0) / h90 : null;
    const feesThisFy = earnings.filter((e) => e.period_end >= fyStart).reduce((s, e) => s + e.fee_usd, 0);

    return {
      client, brands, contacts, engagements, active, channels, signals, health, healthReason,
      lastContact, contactDays, nextDue, overdueDays, rating, ratingAgeDays, openItems,
      outstanding, maxLateDays, outstandingNote, monthly, engagementSummary,
      revenue12, lifetime, daysToPay, netPerHour, feesThisFy, isUpworkHourly, trend,
    };
  });
}

// ---------------------------------------------------------------------------
// Needs attention
// ---------------------------------------------------------------------------

export type Attention = {
  kind: "risk" | "watch" | "task" | "rerate";
  clientId: string;
  clientName: string;
  text: string;
  metric: string;
  metricSub: string;
  action: { label: string; href?: string; markDoneId?: string };
  sortDays: number;
};

const KIND_RANK: Record<Attention["kind"], number> = { risk: 4, watch: 3, task: 2, rerate: 1 };

export function buildAttention(d: Data, views: ClientView[], today: string): Attention[] {
  const out: Attention[] = [];
  for (const v of views) {
    if (v.client.status === "churned") continue;
    const worst = v.signals.find((s) => s.level === v.health && v.health !== "good");
    if (worst) {
      const base = { kind: v.health as "risk" | "watch", clientId: v.client.id, clientName: v.client.name };
      if (worst.key === "payment") {
        const inv = d.invoices
          .filter((i) => i.client_id === v.client.id && isUnpaid(i))
          .sort((a, b) => (a.due_on < b.due_on ? -1 : 1))[0];
        const u = inv ? toUsd(d.fx, inv.amount, inv.currency, today) : 0;
        out.push({
          ...base,
          text: inv
            ? `Invoice ${inv.number}${inv.currency !== "USD" ? `, billed at ${money(inv.amount, inv.currency)},` : ""} is ${v.maxLateDays} days overdue.`
            : worst.detail,
          metric: usd(u),
          metricSub: inr(usdToInr(d.fx, u, today)),
          action: { label: "View invoice", href: `/billing?status=unpaid` },
          sortDays: v.maxLateDays,
        });
      } else if (worst.key === "contact") {
        out.push({
          ...base,
          text: `No call in ${spanText(v.contactDays)}. Your cadence with them is every ${cadenceText(v.client.cadence_days)}.`,
          metric: `${v.contactDays} days`,
          metricSub: v.lastContact ? "since last call" : "with no call logged",
          action: { label: "Log a call", href: `/clients/${v.client.id}#log` },
          sortDays: v.contactDays,
        });
      } else if (worst.key === "trend" && v.trend) {
        out.push({
          ...base,
          text: worst.detail,
          metric: v.trend.unit === "h" ? fmtHours(v.trend.recent) : usd(v.trend.recent),
          metricSub: "in the last 4 weeks",
          action: { label: "Open client", href: `/clients/${v.client.id}` },
          sortDays: Math.round(v.trend.drop * 100),
        });
      } else {
        out.push({
          ...base,
          text: `You rated them ${v.rating?.rating}${v.rating?.reason ? `: "${v.rating.reason}"` : "."}`,
          metric: `${v.ratingAgeDays ?? 0} days`,
          metricSub: "since you rated",
          action: { label: "Open client", href: `/clients/${v.client.id}` },
          sortDays: 0,
        });
      }
    }

    // Overdue action items
    for (const a of v.openItems) {
      if (!a.due_on || a.due_on >= today) continue;
      const late = diffDays(a.due_on, today);
      out.push({
        kind: "task",
        clientId: v.client.id,
        clientName: v.client.name,
        text: `You said you'd ${a.text.charAt(0).toLowerCase()}${a.text.slice(1)} by ${dayMonth(a.due_on)}.`,
        metric: `${late} day${late === 1 ? "" : "s"}`,
        metricSub: "past due",
        action: { label: "Mark done", markDoneId: a.id },
        sortDays: late,
      });
    }

    // Stale or contradicted rating
    if (v.client.status === "active" && v.rating && v.ratingAgeDays !== null) {
      const concernedSince = d.touchpoints.some(
        (x) => x.client_id === v.client.id && x.sentiment === "concerned" && x.occurred_on >= (v.rating as Rating).created_at.slice(0, 10),
      );
      const stale = v.ratingAgeDays > d.thresholds.rating_stale_days;
      if ((stale || concernedSince) && !(worst && worst.key === "rating")) {
        const color = { green: "green", amber: "amber", red: "red" }[v.rating.rating];
        out.push({
          kind: "rerate",
          clientId: v.client.id,
          clientName: v.client.name,
          text: concernedSince
            ? `Your last call felt concerned. Is ${color} still right?`
            : `Your rating is a month old. Still feeling ${color}?`,
          metric: `${v.ratingAgeDays} days`,
          metricSub: "since you rated",
          action: { label: "Re-rate", href: `/clients/${v.client.id}#rating` },
          sortDays: v.ratingAgeDays,
        });
      }
    }
  }
  return out.sort((a, b) => KIND_RANK[b.kind] - KIND_RANK[a.kind] || b.sortDays - a.sortDays);
}

// ---------------------------------------------------------------------------
// Agency figures for the dashboard
// ---------------------------------------------------------------------------

export type MonthPoint = { key: string; label: string; direct: Money; upwork: Money; collected: Money };

export type Dashboard = {
  revenueMonth: Money;
  revenueLastMonth: Money;
  collectedMonth: Money;
  collectedCount: number;
  recurring: Money;
  retainerCount: number;
  outstanding: Money;
  late30: Money;
  contracted90: Money;
  fixedCount: number;
  months: MonthPoint[];
  share: { clientId: string; name: string; usd: number; share: number }[];
  shareTotal: Money;
  upworkCut: { month: string; fees: number; charges: number; gross: number; rate: number | null };
};

export function buildDashboard(d: Data, views: ClientView[], today: string): Dashboard {
  const rev = revenueItems(d);
  const col = collectedItems(d);
  const thisMonth = monthKey(today);
  const lastMonthIso = addMonths(monthStart(today), -1);
  const lastMonth = monthKey(lastMonthIso);

  const revenueMonth = sumWhere(rev, (m) => monthKey(m.date) === thisMonth);
  const revenueLastMonth = sumWhere(rev, (m) => monthKey(m.date) === lastMonth);
  const collectedMonth = sumWhere(col, (m) => monthKey(m.date) === thisMonth);
  const collectedCount =
    d.invoices.filter((i) => i.status === "paid" && i.paid_on && monthKey(i.paid_on) === thisMonth).length +
    d.payouts.filter((p) => monthKey(p.paid_on) === thisMonth).length;

  const activeClientIds = new Set(d.clients.filter((c) => c.status !== "churned").map((c) => c.id));
  const activeEng = d.engagements.filter(
    (e) => e.status === "active" && activeClientIds.has(e.client_id) && (!e.end_date || e.end_date >= today),
  );
  const retainers = activeEng.filter((e) => e.type === "retainer" && e.monthly_value);
  const recurringUsd = retainers.reduce((s, e) => s + toUsd(d.fx, Number(e.monthly_value), e.currency, today), 0);
  const recurring = { usd: recurringUsd, inr: usdToInr(d.fx, recurringUsd, today) };

  const outstanding = views.reduce((acc, v) => add(acc, v.outstanding), zero());
  let late30Usd = 0;
  for (const i of d.invoices) {
    if (isUnpaid(i) && diffDays(i.due_on, today) > 30) late30Usd += toUsd(d.fx, i.amount, i.currency, today);
  }
  const late30 = { usd: late30Usd, inr: usdToInr(d.fx, late30Usd, today) };

  // Next 90 days: up to three more retainer months, plus what's left to bill on fixed projects.
  let contractedUsd = 0;
  for (const e of retainers) {
    const months = e.end_date ? Math.max(0, Math.min(3, Math.ceil(diffDays(today, e.end_date) / 30.4))) : 3;
    contractedUsd += toUsd(d.fx, Number(e.monthly_value), e.currency, today) * months;
  }
  let fixedCount = 0;
  for (const e of activeEng.filter((x) => x.type === "fixed" && x.total_value)) {
    let remaining = 0;
    if (e.channel === "direct") {
      const billed = d.invoices.filter((i) => i.engagement_id === e.id && i.status !== "void").reduce((s, i) => s + i.amount, 0);
      remaining = toUsd(d.fx, Math.max(0, Number(e.total_value) - billed), e.currency, today);
    } else {
      const rows = d.earnings.filter((x) => x.engagement_id === e.id);
      const gross = rows.reduce((s, x) => s + x.gross_usd, 0);
      const feeRate = gross > 0 ? rows.reduce((s, x) => s + x.fee_usd, 0) / gross : 0.1;
      remaining = Math.max(0, Number(e.total_value) - gross) * (1 - feeRate);
    }
    if (remaining > 0) {
      fixedCount += 1;
      contractedUsd += remaining;
    }
  }
  const contracted90 = { usd: contractedUsd, inr: usdToInr(d.fx, contractedUsd, today) };

  const months: MonthPoint[] = [];
  for (let k = 11; k >= 0; k--) {
    const iso = addMonths(monthStart(today), -k);
    const key = monthKey(iso);
    months.push({
      key,
      label: monthShort(iso),
      direct: sumWhere(rev, (m) => m.channel === "direct" && monthKey(m.date) === key),
      upwork: sumWhere(rev, (m) => m.channel === "upwork" && monthKey(m.date) === key),
      collected: sumWhere(col, (m) => monthKey(m.date) === key),
    });
  }

  const from = addDays(today, -365);
  const byClient = new Map<string, number>();
  let shareTotal = zero();
  for (const m of rev) {
    if (m.date <= from || m.date > today) continue;
    byClient.set(m.client_id, (byClient.get(m.client_id) ?? 0) + m.usd);
    shareTotal = add(shareTotal, m);
  }
  const names = new Map(d.clients.map((c) => [c.id, c.name]));
  const share = [...byClient.entries()]
    .map(([clientId, u]) => ({ clientId, name: names.get(clientId) ?? "Unknown", usd: u, share: shareTotal.usd ? u / shareTotal.usd : 0 }))
    .sort((a, b) => b.usd - a.usd);

  const lastMonthEarnings = d.earnings.filter((e) => monthKey(e.period_end) === lastMonth);
  const fees = lastMonthEarnings.reduce((s, e) => s + e.fee_usd, 0);
  const gross = lastMonthEarnings.reduce((s, e) => s + e.gross_usd, 0);
  const charges = d.charges.filter((c) => monthKey(c.occurred_on) === lastMonth).reduce((s, c) => s + c.amount_usd, 0);

  return {
    revenueMonth, revenueLastMonth, collectedMonth, collectedCount, recurring, retainerCount: retainers.length,
    outstanding, late30, contracted90, fixedCount, months, share, shareTotal,
    upworkCut: { month: lastMonthIso, fees, charges, gross, rate: gross > 0 ? (fees + charges) / gross : null },
  };
}

export function inrOf(fx: Fx, usdAmount: number, day: string): number {
  return usdToInr(fx, usdAmount, day);
}
