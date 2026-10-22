import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addBrand,
  addContact,
  addEngagement,
  endEngagement,
  removeBrand,
  removeContact,
  setCadence,
  setRating,
} from "@/app/actions";
import { ActionItemRow } from "@/components/ActionItemRow";
import { CadenceSelect } from "@/components/ClientFields";
import { Composer } from "@/components/Composer";
import { EngagementFields } from "@/components/EngagementFields";
import { MonthlyBars, WeeklyBars } from "@/components/charts";
import {
  IconChevronLeft,
  IconExternal,
  IconFile,
  IconNote,
  IconPhone,
  IconPlus,
  IconStar,
  IconWallet,
  IconX,
} from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import { ChannelChip, Flash, HealthChip, sp } from "@/components/ui";
import {
  addDays,
  addMonths,
  ago,
  dayMonth,
  diffDays,
  fullDate,
  inDays,
  monthKey,
  monthShort,
  monthStart,
  monthYear,
  todayISO,
  weekdayDayMonth,
} from "@/lib/dates";
import { hours, inr, inrShort, money, usd } from "@/lib/format";
import { toUsd, usdToInr } from "@/lib/fx";
import { buildClientViews, cadenceText, LEVEL_LABEL, RATING_LEVEL, type Signal } from "@/lib/model";
import { getData } from "@/lib/session";

type Event = {
  date: string;
  order: string;
  icon: "call" | "money" | "invoice" | "rating" | "note";
  tone?: string;
  title: string;
  body?: string | null;
  chip?: { text: string; cls: string } | null;
  items?: { id: string; text: string; due_on: string | null; done_at: string | null }[];
};

const SENTIMENT: Record<string, { text: string; cls: string }> = {
  good: { text: "Felt good", cls: "chip-good" },
  neutral: { text: "Felt neutral", cls: "chip-neutral" },
  concerned: { text: "Felt concerned", cls: "chip-risk" },
};

const TYPE_LABEL: Record<string, string> = { call: "Call", meeting: "Meeting", async: "Async check-in" };

function SignalRow({ s }: { s: Signal }) {
  return (
    <div className="row gap-14" style={{ padding: "14px 16px", borderRadius: "var(--r-md)", background: "var(--surface-3)" }}>
      <div className="grow stack gap-2">
        <span className="strong">{s.title}</span>
        <span className="small muted">{s.detail}</span>
      </div>
      <HealthChip level={s.level} />
    </div>
  );
}

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const d = await getData();
  const today = todayISO();
  const v = buildClientViews(d, today).find((x) => x.client.id === id);
  if (!v) notFound();
  const c = v.client;
  const self = `/clients/${id}`;
  const showAll = sp(q.all) === "1";

  const primary = v.contacts.find((x) => x.is_primary) ?? v.contacts[0];
  const overdue = c.status === "active" && v.overdueDays > 0;
  const touchpointDates = new Map(d.touchpoints.filter((t) => t.client_id === id).map((t) => [t.id, t.occurred_on]));

  // Chart --------------------------------------------------------------------
  const earnings = d.earnings.filter((e) => e.client_id === id);
  const hourly = earnings.filter((e) => e.kind === "hourly");
  let weekly: { key: string; label: string; value: number; tip: string }[] = [];
  let baseline: number | null = null;
  const unit: "h" | "usd" = hourly.every((e) => e.hours !== null) ? "h" : "usd";
  if (v.isUpworkHourly && hourly.length) {
    const recent = hourly.filter((e) => e.period_end > addDays(today, -84)).sort((a, b) => (a.period_end < b.period_end ? -1 : 1));
    weekly = recent.slice(-12).map((e, i, arr) => {
      const val = unit === "h" ? Number(e.hours) : e.net_usd;
      const showLabel = i === 0 || i === arr.length - 1 || i === Math.floor(arr.length / 2);
      return {
        key: e.id,
        label: showLabel ? dayMonth(e.period_start ?? e.period_end) : "",
        value: val,
        tip: `Week of ${dayMonth(e.period_start ?? e.period_end)}: ${unit === "h" ? hours(val) : usd(val)} billed, ${usd(e.net_usd)} net`,
      };
    });
    baseline = v.trend ? v.trend.priorAvg / 4 : null;
  }
  const invoices = d.invoices.filter((i) => i.client_id === id);
  const monthlyPoints = Array.from({ length: 12 }, (_, k) => {
    const iso = addMonths(monthStart(today), k - 11);
    const key = monthKey(iso);
    const u =
      invoices.filter((i) => i.status !== "void" && monthKey(i.issued_on) === key).reduce((s, i) => s + toUsd(d.fx, i.amount, i.currency, i.issued_on), 0) +
      earnings.filter((e) => monthKey(e.period_end) === key).reduce((s, e) => s + e.net_usd, 0);
    return { key, label: k % 3 === 2 ? monthShort(iso) : "", usd: u, tip: `${monthYear(iso)}: ${usd(u)} (${inrShort(usdToInr(d.fx, u, iso))})` };
  });

  // Timeline -----------------------------------------------------------------
  const events: Event[] = [];
  for (const t of d.touchpoints.filter((x) => x.client_id === id)) {
    events.push({
      date: t.occurred_on,
      order: t.created_at,
      icon: "call",
      title: `${TYPE_LABEL[t.type]}${primary && t.type !== "async" ? ` with ${primary.name.split(" ")[0]}` : ""}`,
      body: t.summary,
      chip: t.sentiment ? SENTIMENT[t.sentiment] : null,
      items: d.actionItems.filter((a) => a.touchpoint_id === t.id),
    });
  }
  for (const n of d.notes.filter((x) => x.client_id === id)) {
    events.push({ date: n.created_at.slice(0, 10), order: n.created_at, icon: "note", title: "Note", body: n.body });
  }
  for (const r of d.ratings.filter((x) => x.client_id === id)) {
    events.push({
      date: r.created_at.slice(0, 10),
      order: r.created_at,
      icon: "rating",
      tone: r.rating,
      title: `You rated them ${LEVEL_LABEL[RATING_LEVEL[r.rating]]}`,
      body: r.reason ? `"${r.reason}"` : null,
    });
  }
  for (const i of invoices) {
    const u = toUsd(d.fx, i.amount, i.currency, i.issued_on);
    events.push({
      date: i.issued_on,
      order: `${i.issued_on}a`,
      icon: "invoice",
      title: `Invoice ${i.number} sent`,
      body: `${usd(u)}${i.currency !== "USD" ? `, billed as ${money(i.amount, i.currency)}` : ""}. Due ${dayMonth(i.due_on)}.${i.status === "void" ? " Voided." : ""}`,
    });
    if (i.status === "paid" && i.paid_on) {
      events.push({
        date: i.paid_on,
        order: `${i.paid_on}b`,
        icon: "invoice",
        title: `Invoice ${i.number} paid`,
        body: `${usd(toUsd(d.fx, i.amount, i.currency, i.paid_on))} after ${diffDays(i.issued_on, i.paid_on)} days${i.amount_received_inr ? `. ${inr(i.amount_received_inr)} landed.` : "."}`,
      });
    }
  }
  for (const e of earnings) {
    events.push({
      date: e.period_end,
      order: `${e.period_end}c`,
      icon: "money",
      title: e.kind === "hourly" ? "Upwork earnings" : e.kind === "milestone" ? "Upwork milestone" : "Upwork bonus",
      body:
        e.kind === "hourly"
          ? `Week of ${dayMonth(e.period_start ?? e.period_end)}: ${e.hours !== null ? `${hours(Number(e.hours))} billed, ` : ""}${usd(e.net_usd, { cents: true })} net.${e.payout_id ? "" : " Not paid out yet."}`
          : `${e.description ?? "Milestone"}: ${usd(e.net_usd, { cents: true })} net.${e.payout_id ? "" : " Not paid out yet."}`,
    });
  }
  events.sort((a, b) => (a.date === b.date ? (a.order < b.order ? 1 : -1) : a.date < b.date ? 1 : -1));
  const shown = showAll ? events : events.slice(0, 25);

  const ratingAge = v.ratingAgeDays;

  return (
    <>
      <Link href="/clients" className="row gap-6 small strong" style={{ textDecoration: "none", minHeight: 44, alignSelf: "flex-start" }}>
        <IconChevronLeft />
        All clients
      </Link>

      <header className="page-head">
        <div className="stack gap-12">
          <div className="row wrap gap-14">
            <h1 className="h1" style={{ fontSize: 44 }}>{c.name}</h1>
            <HealthChip level={v.health} large />
          </div>
          <div className="row wrap gap-8">
            {v.channels.map((ch) => (
              <ChannelChip key={ch} channel={ch} />
            ))}
            {c.status === "paused" && <span className="chip chip-neutral">Paused</span>}
            {c.country && <span className="chip chip-plain">{c.country}</span>}
            {c.client_since && <span className="chip chip-plain">Client since {monthYear(c.client_since)}</span>}
            {v.brands.length > 0 && (
              <span className="chip chip-plain">
                {v.brands.length === 1 ? `Brand: ${v.brands[0].name}` : `${v.brands.length} brands`}
              </span>
            )}
          </div>
        </div>
        <div className="row wrap gap-10">
          <a href="#log" className="btn btn-primary btn-lg">
            <IconPhone size={16} />
            Log a call
          </a>
          <a href="#rating" className="btn btn-lg">Set rating</a>
          <Link href={`${self}/edit`} className="btn btn-lg">Edit</Link>
        </div>
      </header>

      <Flash error={sp(q.error)} ok={sp(q.ok)} />

      {/* Cadence ---------------------------------------------------------------- */}
      <section aria-labelledby="cadence-title" className={`card card-tight${overdue ? " card-risk" : ""}`}>
        <div className="row wrap gap-16" style={{ gap: "16px 32px" }}>
          <div className="row gap-12">
            <div
              aria-hidden="true"
              className="tl-icon"
              style={{ boxShadow: "none", background: overdue ? "var(--risk-bg)" : "var(--neutral-bg)", color: overdue ? "var(--risk)" : "var(--ink)" }}
            >
              <IconPhone />
            </div>
            <div className="stack gap-2">
              <h2 id="cadence-title" className="h3">Calls every {cadenceText(c.cadence_days)}</h2>
              <span className="small muted">{c.cadence_note ?? (primary ? `Check-in with ${primary.name.split(" ")[0]}` : "No note")}</span>
            </div>
          </div>
          <div className="stack gap-2">
            <span className="small muted">Last call</span>
            <span className="strong">{v.lastContact ? `${dayMonth(v.lastContact)}, ${ago(v.lastContact, today)}` : "None logged"}</span>
          </div>
          {c.status === "paused" ? (
            <div className="stack gap-2">
              <span className="small muted">Next call</span>
              <span className="strong">Paused</span>
            </div>
          ) : overdue ? (
            <div className="stack gap-4">
              <span className="small muted">Next call was due</span>
              <span className="chip chip-risk"><span className="dot" />Overdue by {v.overdueDays} day{v.overdueDays === 1 ? "" : "s"}</span>
            </div>
          ) : (
            <div className="stack gap-2">
              <span className="small muted">Next call due</span>
              <span className="strong">By {dayMonth(v.nextDue)}, {inDays(v.nextDue, today)}</span>
            </div>
          )}
          {overdue && (
            <span className="small muted" style={{ maxWidth: 260 }}>
              {v.contactDays >= c.cadence_days * 2
                ? "Contact has dropped to At risk."
                : `Contact has dropped to Watch. At ${c.cadence_days * 2} days it turns At risk.`}
            </span>
          )}
          <details className="panel ml-auto">
            <summary className="btn">Change cadence</summary>
            <form action={setCadence} className="row wrap gap-8 end">
              <input type="hidden" name="client_id" value={c.id} />
              <label className="field"><span>Cadence</span><CadenceSelect name="cadence_days" defaultValue={c.cadence_days} /></label>
              <label className="field"><span>Note</span><input className="input" name="cadence_note" defaultValue={c.cadence_note ?? ""} /></label>
              <SubmitButton className="btn btn-primary">Save</SubmitButton>
            </form>
          </details>
        </div>
      </section>

      {/* Open action items ------------------------------------------------------- */}
      <section aria-labelledby="todo-title" className="card card-tight">
        <div className="row wrap between gap-8">
          <div className="row gap-10">
            <h2 id="todo-title" className="h3">Open action items</h2>
            <span className="chip chip-neutral" style={{ color: "var(--ink)", padding: "2px 9px" }}>{v.openItems.length}</span>
          </div>
          <span className="small muted">Anything past its due date also shows on the dashboard.</span>
        </div>
        {v.openItems.length ? (
          <div className="stack gap-8">
            {v.openItems.map((a) => {
              const from = a.touchpoint_id ? touchpointDates.get(a.touchpoint_id) : null;
              return (
                <ActionItemRow
                  key={a.id}
                  id={a.id}
                  text={a.text}
                  sub={from ? `From the call on ${dayMonth(from)}` : `Added ${dayMonth(a.created_at.slice(0, 10))}`}
                  due={a.due_on ? `Due ${dayMonth(a.due_on)}` : null}
                  late={!!a.due_on && a.due_on < today}
                  doneAt={a.done_at}
                  returnTo={self}
                />
              );
            })}
          </div>
        ) : (
          <p className="small muted">Nothing open. Add action items when you log a call.</p>
        )}
      </section>

      <div className="cols">
        <div className="col-side">
          {/* Health ------------------------------------------------------------- */}
          <section aria-labelledby="health-title" className="card" id="rating">
            <div className="stack gap-4">
              <h2 id="health-title" className="h2">Health</h2>
              <p className="small muted">
                {v.health === "good" ? "Every signal is green." : `${LEVEL_LABEL[v.health]}, because: ${v.healthReason.toLowerCase()}.`} The worst signal sets the status.
              </p>
            </div>
            <div className="stack gap-8">
              {v.signals.map((s) => (
                <SignalRow key={s.key} s={s} />
              ))}
            </div>
            <details className="panel" open={!v.rating}>
              <summary className="btn" style={{ width: "100%" }}>
                <IconStar size={16} />
                {v.rating ? `Re-rate${ratingAge !== null ? ` (last set ${ratingAge} days ago)` : ""}` : "Set your rating"}
              </summary>
              <form action={setRating} className="stack gap-10">
                <input type="hidden" name="client_id" value={c.id} />
                <div className="seg seg-inset" role="radiogroup" aria-label="Rating">
                  <label><input type="radio" name="rating" value="green" defaultChecked={v.rating?.rating === "green"} required />Green</label>
                  <label><input type="radio" name="rating" value="amber" defaultChecked={v.rating?.rating === "amber"} />Amber</label>
                  <label><input type="radio" name="rating" value="red" defaultChecked={v.rating?.rating === "red"} />Red</label>
                </div>
                <label className="field">
                  <span>One-line reason</span>
                  <input className="input" name="reason" placeholder="Happy with the PDP work" />
                </label>
                <SubmitButton className="btn btn-primary" pendingText="Saving…">Save rating</SubmitButton>
              </form>
            </details>
          </section>

          {/* Chart ------------------------------------------------------------- */}
          {weekly.length > 0 ? (
            <section aria-labelledby="hours-title" className="card">
              <div className="stack gap-4">
                <h2 id="hours-title" className="h2">Billed {unit === "h" ? "hours" : "amount"} by week</h2>
                <p className="small muted">Last 12 weeks on Upwork. The bright bars are the 4 weeks the trend compares with the 8 before.</p>
              </div>
              <WeeklyBars points={weekly} unit={unit} highlightFrom={Math.max(0, weekly.length - 4)} baseline={baseline} />
            </section>
          ) : (
            <section aria-labelledby="billed-title" className="card">
              <div className="stack gap-4">
                <h2 id="billed-title" className="h2">Billed by month</h2>
                <p className="small muted">Last 12 months, in US dollars. Hover a month for rupees.</p>
              </div>
              <MonthlyBars points={monthlyPoints} />
            </section>
          )}

          {/* Money ------------------------------------------------------------- */}
          <section aria-labelledby="money-title" className="card">
            <div className="stack gap-4">
              <h2 id="money-title" className="h2">Money</h2>
              <p className="small muted">{v.engagementSummary}</p>
            </div>
            <div className="grid-auto-sm">
              <div className="inset stack gap-4">
                <span className="small muted">Last 12 months</span>
                <span className="kpi-value kpi-value-md">{usd(v.revenue12.usd)}</span>
                <span className="small muted num">{inrShort(v.revenue12.inr)}</span>
              </div>
              <div className="inset stack gap-4">
                <span className="small muted">Lifetime</span>
                <span className="kpi-value kpi-value-md">{usd(v.lifetime.usd)}</span>
                <span className="small muted num">{inrShort(v.lifetime.inr)}</span>
              </div>
              {v.netPerHour !== null ? (
                <div className="inset stack gap-4">
                  <span className="small muted">Net per hour</span>
                  <span className="kpi-value kpi-value-md">{usd(v.netPerHour, { cents: true })}</span>
                  <span className="small muted">last 90 days</span>
                </div>
              ) : (
                <div className="inset stack gap-4">
                  <span className="small muted">Days to pay</span>
                  <span className="kpi-value kpi-value-md">{v.daysToPay === null ? "None" : `${v.daysToPay} days`}</span>
                  <span className="small muted">average, last 12 months</span>
                </div>
              )}
              {v.channels.includes("upwork") ? (
                <div className="inset stack gap-4">
                  <span className="small muted">Upwork fees since 1 Apr</span>
                  <span className="kpi-value kpi-value-md">{usd(v.feesThisFy)}</span>
                  <span className="small muted num">{inrShort(usdToInr(d.fx, v.feesThisFy, today))}</span>
                </div>
              ) : (
                <div className="inset stack gap-4">
                  <span className="small muted">Outstanding</span>
                  <span className="kpi-value kpi-value-md">{usd(v.outstanding.usd)}</span>
                  <span className="small" style={{ color: v.outstandingNote.late ? "var(--risk)" : "var(--ink-2)" }}>{v.outstandingNote.text}</span>
                </div>
              )}
            </div>
          </section>

          {/* Engagements -------------------------------------------------------- */}
          <section aria-labelledby="eng-title" className="card">
            <h2 id="eng-title" className="h2">Engagements</h2>
            <div className="stack gap-8">
              {v.engagements.map((e) => {
                const value =
                  e.type === "retainer"
                    ? `${money(Number(e.monthly_value ?? 0), e.currency)} a month`
                    : e.type === "hourly"
                      ? `${money(Number(e.hourly_rate ?? 0), e.currency)} an hour`
                      : `${money(Number(e.total_value ?? 0), e.currency)} total`;
                const activeNow = e.status === "active" && (!e.end_date || e.end_date >= today);
                return (
                  <div key={e.id} className="row wrap gap-10" style={{ padding: "12px 14px", borderRadius: "var(--r-md)", background: "var(--surface-3)", opacity: activeNow ? 1 : 0.65 }}>
                    <div className="grow stack gap-2" style={{ flex: "1 1 200px" }}>
                      <span className="strong">{e.title ?? { retainer: "Retainer", hourly: "Hourly work", fixed: "Fixed project" }[e.type]}</span>
                      <span className="small muted">
                        {value} · {e.channel === "upwork" ? "Upwork" : "Direct"}
                        {e.start_date ? ` · since ${fullDate(e.start_date)}` : ""}
                        {e.end_date ? ` · ${activeNow ? "ends" : "ended"} ${fullDate(e.end_date)}` : ""}
                      </span>
                    </div>
                    {activeNow ? (
                      <form action={endEngagement}>
                        <input type="hidden" name="client_id" value={c.id} />
                        <input type="hidden" name="id" value={e.id} />
                        <SubmitButton className="btn btn-sm" pendingText="Ending…">End</SubmitButton>
                      </form>
                    ) : (
                      <span className="chip chip-neutral">Ended</span>
                    )}
                  </div>
                );
              })}
              {!v.engagements.length && <p className="small muted">No engagements yet.</p>}
            </div>
            <details className="panel">
              <summary className="btn btn-sm btn-dashed"><IconPlus size={16} />Add engagement</summary>
              <form action={addEngagement} className="stack gap-12">
                <input type="hidden" name="client_id" value={c.id} />
                <EngagementFields required />
                <SubmitButton className="btn btn-primary" pendingText="Saving…">Save engagement</SubmitButton>
              </form>
            </details>
          </section>

          {/* People and links --------------------------------------------------- */}
          <section aria-labelledby="people-title" className="card">
            <h2 id="people-title" className="h2">People and links</h2>
            <div className="stack gap-12">
              {v.contacts.map((p) => (
                <div key={p.id} className="row gap-12">
                  <div className="avatar" aria-hidden="true" style={{ width: 40, height: 40, background: "var(--neutral-bg)", fontWeight: 600 }}>
                    {p.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="grow stack gap-2">
                    <span className="strong">{p.name}</span>
                    <span className="small muted">{[p.role, p.email].filter(Boolean).join(" · ") || "No role"}</span>
                  </div>
                  {p.is_primary && <span className="chip chip-neutral" style={{ padding: "4px 10px", fontSize: 12 }}>Primary</span>}
                  <form action={removeContact}>
                    <input type="hidden" name="client_id" value={c.id} />
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn btn-ghost" aria-label={`Remove ${p.name}`} style={{ width: 40, padding: 0, border: 0, minHeight: 40 }}>
                      <IconX size={16} />
                    </button>
                  </form>
                </div>
              ))}
              <details className="panel">
                <summary className="btn btn-sm btn-dashed"><IconPlus size={16} />Add contact</summary>
                <form action={addContact} className="stack gap-10">
                  <input type="hidden" name="client_id" value={c.id} />
                  <div className="form-grid">
                    <label className="field"><span>Name</span><input className="input" name="name" required /></label>
                    <label className="field"><span>Role</span><input className="input" name="role" /></label>
                    <label className="field"><span>Email</span><input className="input" name="email" type="email" /></label>
                  </div>
                  <label className="row gap-8 small"><input type="checkbox" name="is_primary" /> Primary contact</label>
                  <SubmitButton className="btn btn-primary" pendingText="Saving…">Save contact</SubmitButton>
                </form>
              </details>
            </div>
            <div className="divider" />
            <div className="stack gap-8">
              <span className="small muted">Brands</span>
              <div className="row wrap gap-8">
                {v.brands.map((b) => (
                  <form key={b.id} action={removeBrand} className="chip chip-plain" style={{ paddingRight: 4 }}>
                    <input type="hidden" name="client_id" value={c.id} />
                    <input type="hidden" name="id" value={b.id} />
                    {b.name}
                    <button className="btn btn-ghost" aria-label={`Remove brand ${b.name}`} style={{ minHeight: 24, width: 24, padding: 0, border: 0 }}>
                      <IconX size={12} />
                    </button>
                  </form>
                ))}
                <form action={addBrand} className="row gap-6">
                  <input type="hidden" name="client_id" value={c.id} />
                  <label className="visually-hidden" htmlFor="brand-name">New brand</label>
                  <input id="brand-name" className="input" name="name" placeholder="Add a brand" style={{ width: 160, minHeight: 36 }} />
                  <SubmitButton className="btn btn-sm">Add</SubmitButton>
                </form>
              </div>
            </div>
            {c.asana_url && (
              <a href={c.asana_url} target="_blank" rel="noreferrer" className="row gap-8 small strong" style={{ minHeight: 44 }}>
                <IconExternal />
                Open the Asana project
              </a>
            )}
          </section>
        </div>

        {/* Timeline -------------------------------------------------------------- */}
        <section aria-labelledby="timeline-title" className="card col-main" style={{ gap: 20 }}>
          <h2 id="timeline-title" className="h2">Timeline</h2>
          <Composer clientId={c.id} returnTo={self} today={today} />
          <ol className="timeline">
            {shown.map((e, i) => (
              <li key={`${e.order}-${i}`} className="tl-item">
                <div
                  aria-hidden="true"
                  className={`tl-icon ${
                    e.icon === "call" ? "tl-call" : e.icon === "money" ? "tl-money" : e.icon === "invoice" ? "tl-invoice" : e.icon === "note" ? "tl-note" : `tl-rating ${e.tone ?? ""}`
                  }`}
                >
                  {e.icon === "call" ? <IconPhone /> : e.icon === "money" ? <IconWallet /> : e.icon === "invoice" ? <IconFile /> : e.icon === "note" ? <IconNote /> : <IconStar />}
                </div>
                <div className="tl-body">
                  <div className="row wrap between gap-4" style={{ gap: "4px 12px" }}>
                    <span className="strong">{e.title}</span>
                    <span className="small subtle">{e.date === today ? "Today" : weekdayDayMonth(e.date)}</span>
                  </div>
                  {e.body && <span className="small muted" style={{ whiteSpace: "pre-line" }}>{e.body}</span>}
                  {e.chip && (
                    <div className="row">
                      <span className={`chip ${e.chip.cls}`} style={{ padding: "3px 10px", fontSize: 12 }}>{e.chip.text}</span>
                    </div>
                  )}
                  {e.items?.map((a) => (
                    <ActionItemRow
                      key={a.id}
                      id={a.id}
                      text={a.text}
                      due={a.due_on ? `Due ${dayMonth(a.due_on)}` : null}
                      late={!!a.due_on && a.due_on < today}
                      doneAt={a.done_at}
                      returnTo={self}
                      compact
                    />
                  ))}
                </div>
              </li>
            ))}
          </ol>
          {!events.length && <p className="small muted">Nothing here yet. Log your first call above.</p>}
          {!showAll && events.length > shown.length && (
            <Link href={`${self}?all=1#timeline-title`} className="btn" style={{ alignSelf: "flex-start" }}>
              Show all {events.length} entries
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
