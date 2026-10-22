import Link from "next/link";
import { AttentionList } from "@/components/AttentionList";
import { RevenueChart } from "@/components/charts";
import { IconPhone, IconWarn } from "@/components/Icons";
import { Flash, Kpi, sp } from "@/components/ui";
import { greeting, longDate, monthLong, todayISO } from "@/lib/dates";
import { OWNER_SHORT } from "@/lib/env";
import { inrShort, pct, plural, usd } from "@/lib/format";
import { buildAttention, buildClientViews, buildDashboard } from "@/lib/model";
import { getData } from "@/lib/session";

const COUNT_WORDS = ["Nothing wants", "One thing wants", "Two things want", "Three things want", "Four things want", "Five things want", "Six things want", "Seven things want", "Eight things want", "Nine things want"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const d = await getData();
  const today = todayISO();
  const views = buildClientViews(d, today);
  const attention = buildAttention(d, views, today);
  const dash = buildDashboard(d, views, today);

  const n = attention.length;
  const wants = n < COUNT_WORDS.length ? COUNT_WORDS[n] : `${n} things want`;
  const calm = views.filter((v) => v.client.status === "active" && v.health === "good").length;
  const threshold = d.thresholds.concentration;
  const domain = Math.max(0.4, (dash.share[0]?.share ?? 0) * 1.1);
  const topShare = dash.share.slice(0, 7);
  const otherShare = dash.share.slice(7).reduce((s, x) => s + x.share, 0);
  const lastMonthLabel = monthLong(dash.upworkCut.month);

  return (
    <>
      <header className="page-head">
        <div className="stack gap-6">
          <span className="small subtle">{longDate(today)}</span>
          <h1 className="h1 h1-xl">
            {greeting()}, {OWNER_SHORT}.
          </h1>
          <p className="lead" style={{ fontSize: 17 }}>
            {n === 0
              ? "Nothing needs you this week. Everyone is behaving."
              : `${wants} you this week.${calm ? " Everyone else is behaving." : ""}`}
          </p>
        </div>
        <div className="row wrap gap-10">
          <Link href="/log" className="btn btn-primary btn-lg">
            <IconPhone size={16} />
            Log a call
          </Link>
          <Link href="/billing/new" className="btn btn-lg">Add invoice</Link>
        </div>
      </header>

      <Flash error={sp(q.error)} ok={sp(q.ok)} />

      <section aria-labelledby="attention-title" className="card card-outline">
        <div className="row wrap between gap-12">
          <div className="row gap-12">
            <h2 id="attention-title" className="h2" style={{ fontSize: 24 }}>Needs attention</h2>
            {n > 0 && <span className="count">{n}</span>}
          </div>
          <Link href="/clients" className="small strong">See all clients</Link>
        </div>
        <AttentionList items={attention} />
      </section>

      <div className="grid-auto">
        <Kpi
          label={`Revenue in ${monthLong(today)}`}
          usdValue={dash.revenueMonth.usd}
          inrValue={dash.revenueMonth.inr}
          note={`So far. ${monthLong(dash.upworkCut.month)} was ${usd(dash.revenueLastMonth.usd)}`}
        />
        <Kpi
          label={`Collected in ${monthLong(today)}`}
          usdValue={dash.collectedMonth.usd}
          inrValue={dash.collectedMonth.inr}
          note={dash.collectedCount ? `From ${plural(dash.collectedCount, "payment")}` : "Nothing landed yet"}
        />
        <Kpi
          label="Recurring each month"
          usdValue={dash.recurring.usd}
          inrValue={dash.recurring.inr}
          note={`From ${plural(dash.retainerCount, "retainer")}`}
        />
        <Kpi
          label="Outstanding"
          usdValue={dash.outstanding.usd}
          inrValue={dash.outstanding.inr}
          note={dash.late30.usd > 0 ? `${usd(dash.late30.usd)} is over 30 days late` : "Nothing over 30 days late"}
          noteDot={dash.late30.usd > 0 ? "risk" : undefined}
        />
        <Kpi
          label="Contracted, next 90 days"
          usdValue={dash.contracted90.usd}
          inrValue={dash.contracted90.inr}
          note={`Retainers${dash.fixedCount ? ` plus ${plural(dash.fixedCount, "fixed project")}` : ""}`}
        />
      </div>

      <div className="cols" style={{ gap: 14 }}>
        <section aria-labelledby="trend-title" className="card" style={{ flex: "2 1 520px", gap: 20 }}>
          <div className="row wrap between gap-12" style={{ alignItems: "flex-start" }}>
            <div className="stack gap-4">
              <h2 id="trend-title" className="h2">Revenue, last 12 months</h2>
              <p className="small muted">In US dollars. Upwork counts after its service fee. Hover a month for rupees.</p>
            </div>
            <div className="legend">
              <span><span className="swatch sw-direct" style={{ width: 12, height: 12, borderRadius: 4 }} />Direct</span>
              <span><span className="swatch sw-upwork" style={{ width: 12, height: 12, borderRadius: 4 }} />Upwork</span>
              <span><span style={{ width: 10, height: 10, borderRadius: 10, background: "var(--ink)" }} />Collected</span>
            </div>
          </div>
          <RevenueChart months={dash.months} />
        </section>

        <section aria-labelledby="share-title" className="card" style={{ flex: "1 1 300px", gap: 18 }}>
          <div className="stack gap-4">
            <h2 id="share-title" className="h2">Where revenue comes from</h2>
            <p className="small muted">
              Share of the last 12 months: {usd(dash.shareTotal.usd)} in all, or {inrShort(dash.shareTotal.inr)}. The tick is your {pct(threshold)} line.
            </p>
          </div>
          <div className="stack gap-12">
            {topShare.map((s) => {
              const over = s.share > threshold;
              return (
                <div key={s.clientId} className="stack gap-6">
                  <div className="row between gap-12" style={{ fontSize: 14 }}>
                    <Link href={`/clients/${s.clientId}`} style={{ textDecoration: "none" }}>{s.name}</Link>
                    <span className="num muted">{pct(s.share)}</span>
                  </div>
                  <div className="share-track">
                    <div className={`share-fill${over ? " over" : ""}`} style={{ width: `${Math.min(100, (s.share / domain) * 100)}%` }} />
                    <div className="share-tick" aria-hidden="true" style={{ left: `${(threshold / domain) * 100}%` }} />
                  </div>
                  {over && (
                    <span className="row gap-6 small" style={{ color: "var(--watch)" }}>
                      <IconWarn />
                      Above your {pct(threshold)} line
                    </span>
                  )}
                </div>
              );
            })}
            {otherShare > 0 && <span className="small muted">Everyone else: {pct(otherShare)}</span>}
            {!topShare.length && <span className="small muted">No revenue recorded in the last 12 months yet.</span>}
          </div>
          <div className="divider" />
          <div className="row wrap between end gap-12">
            <div className="stack gap-4">
              <span className="small muted">Upwork&apos;s cut in {lastMonthLabel}</span>
              <span className="kpi-value" style={{ fontSize: 30 }}>{dash.upworkCut.rate === null ? "None" : pct(dash.upworkCut.rate, 1)}</span>
              <span className="small subtle">
                {dash.upworkCut.rate === null
                  ? "No Upwork billing that month."
                  : `${usd(dash.upworkCut.fees + dash.upworkCut.charges)} in fees and charges on ${usd(dash.upworkCut.gross)} billed`}
              </span>
            </div>
            <Link href="/billing/upwork" className="small strong">See Upwork billing</Link>
          </div>
        </section>
      </div>
    </>
  );
}
