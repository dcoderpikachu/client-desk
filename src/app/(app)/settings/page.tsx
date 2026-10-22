import { saveThresholds } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash, sp } from "@/components/ui";
import { fullDate } from "@/lib/dates";
import { latestDay, perUsd } from "@/lib/fx";
import { getData } from "@/lib/session";

const TABLES = [
  ["clients", "Clients"],
  ["engagements", "Engagements"],
  ["contacts", "Contacts"],
  ["brands", "Brands"],
  ["touchpoints", "Calls and meetings"],
  ["action_items", "Action items"],
  ["notes", "Notes"],
  ["health_ratings", "Your ratings"],
  ["invoices", "Direct invoices"],
  ["upwork_earnings", "Upwork earnings"],
  ["upwork_charges", "Upwork charges"],
  ["payouts", "Upwork payouts"],
  ["fx_rates", "Exchange rates"],
] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const d = await getData();
  const t = d.thresholds;
  const fxDay = latestDay(d.fx);

  return (
    <>
      <header className="stack gap-6">
        <h1 className="h1">Settings</h1>
        <p className="lead">The lines that decide when a client turns amber or red, and a copy of everything.</p>
      </header>
      <Flash error={sp(q.error)} ok={sp(q.ok)} />

      <form action={saveThresholds} className="card" style={{ maxWidth: 820 }}>
        <h2 className="h2">Health thresholds</h2>
        <div className="form-grid">
          <label className="field">
            <span>Payment turns red after, days overdue</span>
            <input className="input" name="payment_red_days" type="number" min={1} defaultValue={t.payment_red_days - 1} />
          </label>
          <label className="field">
            <span>Upwork amber at a drop of, %</span>
            <input className="input" name="trend_amber_drop" type="number" min={1} max={100} defaultValue={Math.round(t.trend_amber_drop * 100)} />
          </label>
          <label className="field">
            <span>Upwork red at a drop of, %</span>
            <input className="input" name="trend_red_drop" type="number" min={1} max={100} defaultValue={Math.round(t.trend_red_drop * 100)} />
          </label>
          <label className="field">
            <span>Red when nothing billed for, days</span>
            <input className="input" name="trend_quiet_days" type="number" min={1} defaultValue={t.trend_quiet_days} />
          </label>
          <label className="field">
            <span>Ask to re-rate after, days</span>
            <input className="input" name="rating_stale_days" type="number" min={1} defaultValue={t.rating_stale_days} />
          </label>
          <label className="field">
            <span>Concentration warning above, %</span>
            <input className="input" name="concentration" type="number" min={1} max={100} defaultValue={Math.round(t.concentration * 100)} />
          </label>
        </div>
        <p className="small muted">Contact is set per client by their call cadence: amber once a call is late, red at twice the cadence.</p>
        <div className="form-actions">
          <SubmitButton className="btn btn-primary" pendingText="Saving…">Save thresholds</SubmitButton>
        </div>
      </form>

      <section className="card" style={{ maxWidth: 820 }}>
        <div className="stack gap-4">
          <h2 className="h2">Export everything</h2>
          <p className="small muted">One CSV per table. Supabase also keeps its own backups.</p>
        </div>
        <div className="row wrap gap-8">
          {TABLES.map(([table, label]) => (
            <a key={table} href={`/api/export/${table}`} className="btn btn-sm">{label}</a>
          ))}
        </div>
      </section>

      <section className="card" style={{ maxWidth: 820, gap: 8 }}>
        <h2 className="h2">Exchange rates</h2>
        <p className="small muted">
          The database fetches ECB reference rates every evening. Latest: {fxDay ? fullDate(fxDay) : "none yet"}, at ₹{perUsd(d.fx, "INR", fxDay ?? "9999-12-31").toFixed(2)} and €
          {perUsd(d.fx, "EUR", fxDay ?? "9999-12-31").toFixed(4)} per dollar. Money that has landed always uses the rupees you entered.
        </p>
      </section>
    </>
  );
}
