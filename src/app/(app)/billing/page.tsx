import Link from "next/link";
import { markInvoicePaid, voidInvoice } from "@/app/actions";
import { BillingTabs } from "@/components/BillingTabs";
import { IconPlus, IconUpload } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash, sp } from "@/components/ui";
import { addDays, dayMonth, diffDays, todayISO } from "@/lib/dates";
import { inr, inrShort, money, pct, plural, usd } from "@/lib/format";
import { perUsd, toUsd, usdToInr } from "@/lib/fx";
import { getData } from "@/lib/session";
import type { Invoice } from "@/lib/types";

type Q = Record<string, string | string[] | undefined>;

const STATUS = {
  late: { label: "Overdue", cls: "chip-risk" },
  sent: { label: "Sent", cls: "chip-neutral" },
  partially_paid: { label: "Part paid", cls: "chip-watch" },
  paid: { label: "Paid", cls: "chip-good" },
  void: { label: "Void", cls: "chip-neutral" },
} as const;

export default async function BillingPage({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const filter = sp(q.status) ?? "all";
  const payingId = sp(q.pay);
  const d = await getData();
  const today = todayISO();
  const names = new Map(d.clients.map((c) => [c.id, c.name]));

  const unpaid = d.invoices.filter((i) => i.status === "sent" || i.status === "partially_paid");
  const bucket = (lo: number, hi: number) => {
    const rows = unpaid.filter((i) => {
      const late = diffDays(i.due_on, today);
      return late >= lo && late <= hi;
    });
    const u = rows.reduce((s, i) => s + toUsd(d.fx, i.amount, i.currency, today), 0);
    return { count: rows.length, usd: u, inr: usdToInr(d.fx, u, today), rows };
  };
  const buckets = [
    { label: "Not due yet", ...bucket(-100000, 0), tone: "" },
    { label: "1 to 30 days late", ...bucket(1, 30), tone: "" },
    { label: "31 to 60 days late", ...bucket(31, 60), tone: "risk" },
    { label: "More than 60 days late", ...bucket(61, 100000), tone: "risk" },
  ];

  const rows = [...d.invoices]
    .filter((i) => (filter === "unpaid" ? i.status === "sent" || i.status === "partially_paid" : filter === "paid" ? i.status === "paid" : true))
    .sort((a, b) => (a.issued_on === b.issued_on ? (a.number < b.number ? 1 : -1) : a.issued_on < b.issued_on ? 1 : -1));
  const shown = rows.slice(0, sp(q.all) === "1" ? rows.length : 60);

  const paying = payingId ? d.invoices.find((i) => i.id === payingId) : undefined;
  const payingUsd = paying ? toUsd(d.fx, paying.amount, paying.currency, today) : 0;

  // What conversion cost: invoiced value at the issue-date rate minus the rupees that landed.
  const recentPaid = d.invoices.filter((i) => i.status === "paid" && i.paid_on && i.paid_on > addDays(today, -92) && i.amount_received_inr);
  const expectedInr = recentPaid.reduce((s, i) => s + usdToInr(d.fx, toUsd(d.fx, i.amount, i.currency, i.issued_on), i.issued_on), 0);
  const landedInr = recentPaid.reduce((s, i) => s + Number(i.amount_received_inr), 0);
  const gapInr = expectedInr - landedInr;

  const statusOf = (i: Invoice) => (i.status !== "paid" && i.status !== "void" && i.due_on < today ? "late" : i.status);

  return (
    <>
      <header className="page-head">
        <div className="stack gap-6">
          <h1 className="h1">Billing</h1>
          <p className="lead">Direct clients pay per Wise invoice. Upwork pays out once a month.</p>
        </div>
        <div className="row wrap gap-10">
          <Link href="/billing/new" className="btn btn-primary btn-lg"><IconPlus size={16} />Add invoice</Link>
          <Link href="/billing/import" className="btn btn-lg"><IconUpload size={16} />Import CSV</Link>
        </div>
      </header>

      <BillingTabs current="direct" />
      <Flash error={sp(q.error)} ok={sp(q.ok)} />

      <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}>
        {buckets.map((b) => (
          <div key={b.label} className="kpi" style={b.tone && b.count ? { border: "1px solid var(--risk-line)" } : undefined}>
            <span className="kpi-label" style={b.tone && b.count ? { color: "var(--risk)", fontWeight: 600 } : undefined}>{b.label}</span>
            <span className="kpi-value" style={{ fontSize: 30 }}>{usd(b.usd)}</span>
            <span className="kpi-inr">{inrShort(b.inr)}</span>
            <span className="kpi-note">
              {b.count === 0
                ? b.label.startsWith("More") ? "Nothing here. Keep it that way." : "Nothing"
                : b.count === 1 && b.tone
                  ? `1 invoice, ${names.get(b.rows[0].client_id)}`
                  : plural(b.count, "invoice")}
            </span>
          </div>
        ))}
      </div>

      <section aria-labelledby="inv-title" className="card" style={{ padding: "22px 22px 14px", gap: 14 }}>
        <div className="row wrap between gap-12">
          <h2 id="inv-title" className="h2">Invoices</h2>
          <nav className="seg seg-inset" aria-label="Status">
            {[
              ["all", `All ${d.invoices.length}`],
              ["unpaid", `Unpaid ${unpaid.length}`],
              ["paid", `Paid ${d.invoices.filter((i) => i.status === "paid").length}`],
            ].map(([k, label]) => (
              <Link key={k} href={k === "all" ? "/billing" : `/billing?status=${k}`} aria-current={filter === k ? "true" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {paying && paying.status !== "paid" && (
          <form action={markInvoicePaid} className="row wrap end gap-12" style={{ padding: 18, borderRadius: "var(--r-lg)", background: "var(--surface-3)", border: "1px solid var(--line-3)" }}>
            <input type="hidden" name="id" value={paying.id} />
            <div className="stack gap-2" style={{ flex: "1 1 240px" }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Mark {paying.number} paid</span>
              <span className="small muted">
                {names.get(paying.client_id)}, {usd(payingUsd)}
                {paying.currency !== "USD" ? ` (${money(paying.amount, paying.currency)})` : ""}. Enter the rupees that actually landed, so the conversion cost stays honest. About{" "}
                {inr(usdToInr(d.fx, payingUsd, today))} at today&apos;s rate.
              </span>
            </div>
            <label className="field">
              <span>Date received</span>
              <input className="input" type="date" name="paid_on" defaultValue={today} max={today} style={{ width: 170 }} />
            </label>
            <label className="field">
              <span>INR received</span>
              <input className="input" name="amount_received_inr" inputMode="decimal" placeholder="₹" style={{ width: 170 }} />
            </label>
            <div className="row gap-8">
              <Link href="/billing" className="btn">Cancel</Link>
              <SubmitButton className="btn btn-primary" pendingText="Saving…">Mark paid</SubmitButton>
            </div>
          </form>
        )}

        <div className="table-box">
          <table className="table num" style={{ minWidth: 940 }}>
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Client</th>
                <th scope="col">Issued</th>
                <th scope="col">Due</th>
                <th scope="col" className="r">Amount in USD</th>
                <th scope="col" className="r">In rupees</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => {
                const s = statusOf(i);
                const open = i.status === "sent" || i.status === "partially_paid";
                const day = i.status === "paid" && i.paid_on ? i.paid_on : open ? today : i.issued_on;
                const u = toUsd(d.fx, i.amount, i.currency, day);
                const late = diffDays(i.due_on, today);
                return (
                  <tr key={i.id}>
                    <td className="strong">{i.number}</td>
                    <td><Link href={`/clients/${i.client_id}`} style={{ textDecoration: "none" }}>{names.get(i.client_id)}</Link></td>
                    <td className="muted">{dayMonth(i.issued_on)}</td>
                    <td className="muted">{dayMonth(i.due_on)}</td>
                    <td className="r">
                      <div className="cell-stack r">
                        <span style={{ fontSize: 17, fontWeight: 700 }}>{usd(u)}</span>
                        {i.currency !== "USD" && <span className="xsmall subtle">billed as {money(i.amount, i.currency)}</span>}
                      </div>
                    </td>
                    <td className="r">
                      <div className="cell-stack r">
                        <span className="muted">{inr(i.status === "paid" && i.amount_received_inr ? i.amount_received_inr : usdToInr(d.fx, u, day))}</span>
                        <span className="xsmall subtle">
                          {i.status === "paid" ? (i.amount_received_inr ? "received" : "estimated") : open ? "at today's rate" : ""}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack" style={{ alignItems: "flex-start", gap: 3 }}>
                        <span className={`chip ${STATUS[s].cls}`} style={{ padding: "4px 11px" }}>
                          <span className="dot" aria-hidden="true" />
                          {STATUS[s].label}
                        </span>
                        <span className="xsmall muted">
                          {s === "late" ? `${late} days late` : s === "paid" && i.paid_on ? `paid ${dayMonth(i.paid_on)}` : open ? (late === 0 ? "due today" : `due in ${-late} days`) : ""}
                        </span>
                      </div>
                    </td>
                    <td className="r" style={{ paddingTop: 10, paddingBottom: 10 }}>
                      {open && (
                        <div className="row gap-6" style={{ justifyContent: "flex-end" }}>
                          <Link href={`/billing?pay=${i.id}${filter !== "all" ? `&status=${filter}` : ""}`} className="btn btn-sm">Mark paid</Link>
                          <details className="panel" style={{ position: "relative" }}>
                            <summary className="btn btn-sm btn-ghost" aria-label={`More for ${i.number}`} style={{ border: 0 }}>•••</summary>
                            <form action={voidInvoice} style={{ position: "absolute", right: 0, top: 44, zIndex: 2 }}>
                              <input type="hidden" name="id" value={i.id} />
                              <SubmitButton className="btn btn-sm" pendingText="Voiding…">Void invoice</SubmitButton>
                            </form>
                          </details>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <p className="muted" style={{ padding: "24px 16px", textAlign: "center" }}>No invoices here yet. Add one, or import your Wise history.</p>}
          {rows.length > shown.length && (
            <Link href={`/billing?all=1${filter !== "all" ? `&status=${filter}` : ""}`} className="btn" style={{ margin: "8px 0 4px" }}>
              Show all {rows.length}
            </Link>
          )}
        </div>
      </section>

      <div className="card card-tight row wrap between" style={{ flexDirection: "row", alignItems: "center", gap: "12px 20px" }}>
        <div className="stack gap-2">
          <span className="muted">What conversion cost you, last 3 months</span>
          <span className="small subtle">Invoiced value at the issue-date rate, minus the rupees that landed</span>
        </div>
        <div className="row gap-10" style={{ alignItems: "baseline" }}>
          <span className="num" style={{ fontSize: 26, fontWeight: 700 }}>{usd(gapInr / perUsd(d.fx, "INR", today))}</span>
          <span className="small muted">
            {inr(gapInr)}
            {expectedInr > 0 ? `, or ${pct(gapInr / expectedInr, 1)} of invoiced` : ""}
          </span>
        </div>
      </div>
    </>
  );
}
