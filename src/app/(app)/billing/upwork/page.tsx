import Link from "next/link";
import { recordPayoutInr } from "@/app/actions";
import { BillingTabs } from "@/components/BillingTabs";
import { IconCheck, IconChevronLeft, IconChevronRight, IconUpload } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash, sp } from "@/components/ui";
import { addMonths, dayMonth, fullDate, monthKey, monthLong, monthStart, monthYear, todayISO } from "@/lib/dates";
import { hours, inr, inrShort, pct, plural, usd } from "@/lib/format";
import { perUsd, usdToInr } from "@/lib/fx";
import { getData } from "@/lib/session";
import type { Charge, Earning, Payout } from "@/lib/types";

const CHARGE_LABEL: Record<Charge["kind"], string> = {
  membership: "Membership",
  connects: "Connects",
  withdrawal_fee: "Withdrawal fee",
  other: "Other",
};

function check(p: Payout, earnings: Earning[], charges: Charge[]) {
  const net = earnings.filter((e) => e.payout_id === p.id).reduce((s, e) => s + e.net_usd, 0);
  const chg = charges.filter((c) => c.payout_id === p.id).reduce((s, c) => s + c.amount_usd, 0);
  const diff = Math.round((p.usd_withdrawn - (net - chg)) * 100) / 100;
  return { net, chg, diff, ok: Math.abs(diff) < 0.01 };
}

export default async function UpworkBillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const d = await getData();
  const today = todayISO();
  const names = new Map(d.clients.map((c) => [c.id, c.name]));

  const payoutsDesc = [...d.payouts].sort((a, b) => (a.paid_on < b.paid_on ? 1 : -1));
  const defaultMonth = payoutsDesc[0] ? monthKey(payoutsDesc[0].paid_on) : monthKey(addMonths(monthStart(today), -1));
  const month = /^\d{4}-\d{2}$/.test(sp(q.month) ?? "") ? (sp(q.month) as string) : defaultMonth;
  const monthIso = `${month}-01`;
  const prev = monthKey(addMonths(monthIso, -1));
  const next = monthKey(addMonths(monthIso, 1));
  const canNext = next <= monthKey(today);

  const monthPayouts = d.payouts.filter((p) => monthKey(p.paid_on) === month);
  const payoutIds = new Set(monthPayouts.map((p) => p.id));
  const hasPayout = monthPayouts.length > 0;
  const earnings = hasPayout ? d.earnings.filter((e) => e.payout_id && payoutIds.has(e.payout_id)) : d.earnings.filter((e) => monthKey(e.period_end) === month);
  const charges = hasPayout ? d.charges.filter((c) => c.payout_id && payoutIds.has(c.payout_id)) : d.charges.filter((c) => monthKey(c.occurred_on) === month);

  const net = earnings.reduce((s, e) => s + e.net_usd, 0);
  const gross = earnings.reduce((s, e) => s + e.gross_usd, 0);
  const fees = earnings.reduce((s, e) => s + e.fee_usd, 0);
  const chg = charges.reduce((s, c) => s + c.amount_usd, 0);
  const withdrawn = monthPayouts.reduce((s, p) => s + p.usd_withdrawn, 0);
  const landed = monthPayouts.reduce((s, p) => s + (p.inr_received ?? 0), 0);
  const allLanded = monthPayouts.every((p) => p.inr_received !== null);
  const lastPaid = monthPayouts.map((p) => p.paid_on).sort().at(-1);
  const rate = landed && withdrawn ? landed / withdrawn : lastPaid ? perUsd(d.fx, "INR", lastPaid) : perUsd(d.fx, "INR", today);
  const diff = Math.round((withdrawn - (net - chg)) * 100) / 100;
  const addsUp = Math.abs(diff) < 0.01;

  const byClient = new Map<string, { hours: number; hoursKnown: boolean; gross: number; fee: number; net: number; milestone: boolean }>();
  for (const e of earnings) {
    const r = byClient.get(e.client_id) ?? { hours: 0, hoursKnown: true, gross: 0, fee: 0, net: 0, milestone: false };
    if (e.kind === "hourly") {
      if (e.hours === null) r.hoursKnown = false;
      else r.hours += Number(e.hours);
    } else r.milestone = true;
    r.gross += e.gross_usd;
    r.fee += e.fee_usd;
    r.net += e.net_usd;
    byClient.set(e.client_id, r);
  }
  const clientRows = [...byClient.entries()].sort((a, b) => b[1].net - a[1].net);

  const chargeGroups = new Map<string, { label: string; count: number; total: number }>();
  for (const c of charges) {
    const g = chargeGroups.get(c.kind) ?? { label: CHARGE_LABEL[c.kind], count: 0, total: 0 };
    g.count += 1;
    g.total += c.amount_usd;
    chargeGroups.set(c.kind, g);
  }

  const waiting = d.earnings.filter((e) => !e.payout_id).reduce((s, e) => s + e.net_usd, 0);
  const lastUpload = d.earnings.reduce((m, e) => ((e.txn_date ?? e.period_end) > m ? (e.txn_date ?? e.period_end) : m), "");

  return (
    <>
      <header className="page-head">
        <div className="stack gap-6">
          <h1 className="h1">Billing</h1>
          <p className="lead">Direct clients pay per Wise invoice. Upwork pays out once a month.</p>
        </div>
        <div className="row wrap gap-12" style={{ gap: "10px 14px" }}>
          {lastUpload && <span className="small subtle">Latest transaction {dayMonth(lastUpload)}</span>}
          <Link href="/billing/upwork/import" className="btn btn-primary btn-lg">
            <IconUpload size={16} />
            Upload Upwork export
          </Link>
        </div>
      </header>

      <div className="row wrap between gap-14">
        <BillingTabs current="upwork" />
        <nav className="seg" aria-label="Month" style={{ padding: 5, alignItems: "center" }}>
          <Link href={`/billing/upwork?month=${prev}`} aria-label="Previous month" style={{ width: 44, justifyContent: "center", padding: 0 }}>
            <IconChevronLeft size={18} />
          </Link>
          <span style={{ minWidth: 150, textAlign: "center", fontSize: 18, fontWeight: 700 }}>{monthYear(monthIso)}</span>
          {canNext ? (
            <Link href={`/billing/upwork?month=${next}`} aria-label="Next month" style={{ width: 44, justifyContent: "center", padding: 0 }}>
              <IconChevronRight size={18} />
            </Link>
          ) : (
            <span style={{ width: 44 }} />
          )}
        </nav>
      </div>

      <Flash error={sp(q.error)} ok={sp(q.ok)} />

      <section aria-labelledby="payout-title" className="card" style={{ gap: 20 }}>
        <div className="row wrap between gap-12">
          <div className="stack gap-4">
            <h2 id="payout-title" className="h2" style={{ fontSize: 22 }}>
              {hasPayout ? `${monthLong(monthIso)} payout` : `${monthLong(monthIso)}: no withdrawal yet`}
            </h2>
            <p className="small muted">
              {hasPayout
                ? "What your clients earned you, minus what Upwork charged the account, should equal what you withdrew."
                : "These are the earnings and charges recorded this month. They'll settle into the next withdrawal."}
            </p>
          </div>
          {hasPayout &&
            (addsUp ? (
              <span className="chip chip-good chip-lg"><IconCheck />Adds up</span>
            ) : (
              <span className="chip chip-watch chip-lg"><span className="dot" />Off by {usd(Math.abs(diff), { cents: true })}</span>
            ))}
        </div>
        <p className="visually-hidden">
          Net earnings of {usd(net, { cents: true })} minus account charges of {usd(chg, { cents: true })}
          {hasPayout ? ` against ${usd(withdrawn, { cents: true })} withdrawn, which landed as ${inr(landed)}.` : "."}
        </p>
        <div className="eq" aria-hidden="true">
          <div className="eq-box">
            <span className="small muted">Net earnings</span>
            <b>{usd(net, { cents: true })}</b>
            <span className="xsmall muted">{plural(byClient.size, "client")}, after service fees</span>
          </div>
          <span className="eq-op">−</span>
          <div className="eq-box">
            <span className="small muted">Account charges</span>
            <b>{usd(chg, { cents: true })}</b>
            <span className="xsmall muted">membership, connects, withdrawal</span>
          </div>
          <span className="eq-op">=</span>
          <div className="eq-box">
            <span className="small muted">{hasPayout ? "Withdrawn" : "Due to withdraw"}</span>
            <b>{usd(hasPayout ? withdrawn : net - chg, { cents: true })}</b>
            <span className="xsmall muted">{lastPaid ? `on ${dayMonth(lastPaid)}` : "not yet"}</span>
          </div>
          {hasPayout && (
            <>
              <span className="eq-op">→</span>
              <div className="eq-box final">
                <span className="small strong">Landed in your bank</span>
                {allLanded ? (
                  <>
                    <b>{inr(landed)}</b>
                    <span className="xsmall muted">at ₹{rate.toFixed(2)} per dollar</span>
                  </>
                ) : (
                  <>
                    <b>About {inrShort(usdToInr(d.fx, withdrawn, lastPaid ?? today))}</b>
                    <span className="xsmall muted">enter the actual amount below</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        {hasPayout && !addsUp && (
          <p className="small muted">
            A gap usually means earnings were still on hold when you withdrew, or part of the export is missing. Uploading the next month&apos;s export normally
            closes it.
          </p>
        )}
        {monthPayouts
          .filter((p) => p.inr_received === null)
          .map((p) => (
            <form key={p.id} action={recordPayoutInr} className="row wrap end gap-10" style={{ padding: 16, borderRadius: "var(--r-lg)", background: "var(--surface-3)" }}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="return_to" value={`/billing/upwork?month=${month}`} />
              <span className="grow small" style={{ flex: "1 1 220px" }}>
                How many rupees did the {usd(p.usd_withdrawn, { cents: true })} withdrawal on {dayMonth(p.paid_on)} land as?
              </span>
              <label className="field">
                <span>INR received</span>
                <input className="input" name="inr_received" inputMode="decimal" required placeholder="₹" style={{ width: 180 }} />
              </label>
              <SubmitButton className="btn btn-primary" pendingText="Saving…">Save</SubmitButton>
            </form>
          ))}
      </section>

      <div className="cols">
        <section aria-labelledby="earn-title" className="card" style={{ flex: "2 1 520px", padding: "22px 22px 16px" }}>
          <div className="stack gap-4">
            <h2 id="earn-title" className="h2">Earnings by client</h2>
            <p className="small muted">The service fee comes off each client&apos;s revenue, because it&apos;s charged on their work.</p>
          </div>
          <div className="table-box">
            <table className="table num" style={{ minWidth: 620 }}>
              <thead>
                <tr>
                  <th scope="col">Client</th>
                  <th scope="col" className="r">Hours</th>
                  <th scope="col" className="r">Gross</th>
                  <th scope="col" className="r">Service fee</th>
                  <th scope="col" className="r">Net</th>
                  <th scope="col" className="r">Net per hour</th>
                </tr>
              </thead>
              <tbody>
                {clientRows.map(([cid, r]) => (
                  <tr key={cid}>
                    <td><Link href={`/clients/${cid}`} className="strong" style={{ textDecoration: "none" }}>{names.get(cid)}</Link></td>
                    <td className="r muted">{r.hours > 0 && r.hoursKnown ? hours(r.hours) : r.milestone ? "Milestone" : "Not given"}</td>
                    <td className="r">{usd(r.gross, { cents: true })}</td>
                    <td className="r muted">−{usd(r.fee, { cents: true })}</td>
                    <td className="r strong">{usd(r.net, { cents: true })}</td>
                    <td className="r">{r.hours > 0 && r.hoursKnown && !r.milestone ? usd(r.net / r.hours, { cents: true }) : <span className="subtle">Fixed price</span>}</td>
                  </tr>
                ))}
              </tbody>
              {clientRows.length > 0 && (
                <tfoot>
                  <tr>
                    <th scope="row" style={{ textAlign: "left" }}>Total</th>
                    <td className="r muted">{hours(clientRows.reduce((s, [, r]) => s + r.hours, 0))}</td>
                    <td className="r strong">{usd(gross, { cents: true })}</td>
                    <td className="r muted">−{usd(fees, { cents: true })}</td>
                    <td className="r" style={{ fontSize: 17, fontWeight: 700 }}>{usd(net, { cents: true })}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
            {!clientRows.length && <p className="muted" style={{ padding: "18px 4px" }}>No Upwork earnings for this month. Upload your export to fill this in.</p>}
          </div>
        </section>

        <div className="stack gap-16" style={{ flex: "1 1 300px", minWidth: 0 }}>
          <section aria-labelledby="charges-title" className="card">
            <div className="stack gap-4">
              <h2 id="charges-title" className="h2">Account charges</h2>
              <p className="small muted">A cost of the channel, never split across clients.</p>
            </div>
            <div className="stack gap-6 num">
              {[...chargeGroups.values()].map((g) => (
                <div key={g.label} className="row between gap-12" style={{ padding: "12px 14px", borderRadius: "var(--r-md)", background: "var(--surface-2)" }}>
                  <span>{g.label}{g.count > 1 ? `, ${g.count} purchases` : ""}</span>
                  <span>{usd(g.total, { cents: true })}</span>
                </div>
              ))}
              {chargeGroups.size === 0 && <p className="small muted">No charges this month.</p>}
              {chargeGroups.size > 0 && (
                <div className="row between gap-12 strong" style={{ padding: "10px 14px" }}>
                  <span>Total</span>
                  <span>{usd(chg, { cents: true })}</span>
                </div>
              )}
            </div>
          </section>
          <section aria-labelledby="cut-title" className="card" style={{ gap: 6 }}>
            <h2 id="cut-title" className="small muted" style={{ fontWeight: 500 }}>Upwork&apos;s cut in {monthLong(monthIso)}</h2>
            <span className="kpi-value" style={{ fontSize: 36 }}>{gross > 0 ? pct((fees + chg) / gross, 1) : "None"}</span>
            <span className="small muted">
              {gross > 0 ? `${usd(fees)} in service fees plus ${usd(chg)} in charges, on ${usd(gross)} your clients paid.` : "No Upwork billing this month."}
            </span>
          </section>
          {waiting > 0 && (
            <section className="card" style={{ gap: 6 }}>
              <span className="small muted">Waiting in Upwork</span>
              <span className="kpi-value kpi-value-md">{usd(waiting)}</span>
              <span className="small muted">Net earnings not yet withdrawn. Counted in Outstanding on the dashboard.</span>
            </section>
          )}
        </div>
      </div>

      <section aria-labelledby="hist-title" className="card" style={{ padding: "22px 22px 16px" }}>
        <div className="stack gap-4">
          <h2 id="hist-title" className="h2">Past payouts</h2>
          <p className="small muted">Each month is checked: earnings minus charges should equal what you withdrew.</p>
        </div>
        <div className="table-box">
          <table className="table num" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th scope="col">Withdrawn on</th>
                <th scope="col" className="r">Withdrawn</th>
                <th scope="col" className="r">Landed</th>
                <th scope="col" className="r">Rate</th>
                <th scope="col">Check</th>
              </tr>
            </thead>
            <tbody>
              {payoutsDesc.slice(0, 12).map((p) => {
                const c = check(p, d.earnings, d.charges);
                return (
                  <tr key={p.id}>
                    <td><Link href={`/billing/upwork?month=${monthKey(p.paid_on)}`} className="strong" style={{ textDecoration: "none" }}>{fullDate(p.paid_on)}</Link></td>
                    <td className="r">{usd(p.usd_withdrawn, { cents: true })}</td>
                    <td className="r">{p.inr_received !== null ? inr(p.inr_received) : <span className="subtle">Not entered</span>}</td>
                    <td className="r muted">{p.inr_received ? `₹${(p.inr_received / p.usd_withdrawn).toFixed(2)}` : ""}</td>
                    <td>
                      {c.ok ? (
                        <span className="chip chip-good" style={{ padding: "4px 11px" }}><span className="dot" />Adds up</span>
                      ) : (
                        <span className="chip chip-watch" style={{ padding: "4px 11px" }}><span className="dot" />Off by {usd(Math.abs(c.diff), { cents: true })}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!payoutsDesc.length && <p className="muted" style={{ padding: "18px 4px" }}>No withdrawals yet. They come in with your Upwork export.</p>}
        </div>
      </section>
    </>
  );
}
