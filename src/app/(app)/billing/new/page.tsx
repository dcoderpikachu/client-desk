import Link from "next/link";
import { addInvoice } from "@/app/actions";
import { CurrencySelect } from "@/components/ClientFields";
import { IconChevronLeft } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash, sp } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import { getData } from "@/lib/session";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const d = await getData();
  const clients = d.clients.filter((c) => c.status !== "churned");
  const pre = clients.find((c) => c.id === sp(q.client));
  const last = [...d.invoices].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })).at(-1);
  const suggested = last ? bump(last.number) : "";

  return (
    <>
      <Link href="/billing" className="row gap-6 small strong" style={{ textDecoration: "none", minHeight: 44, alignSelf: "flex-start" }}>
        <IconChevronLeft />
        Billing
      </Link>
      <header className="stack gap-6">
        <h1 className="h1">Add an invoice</h1>
        <p className="lead">Record an invoice you&apos;ve already sent from Wise. This tool tracks it; Wise stays the source.</p>
      </header>
      <Flash error={sp(q.error)} />
      <form action={addInvoice} className="card" style={{ maxWidth: 760 }}>
        <input type="hidden" name="return_to" value={pre ? `/clients/${pre.id}` : "/billing"} />
        <div className="form-grid">
          <label className="field">
            <span>Client</span>
            <select className="select" name="client_id" required defaultValue={pre?.id ?? ""}>
              <option value="" disabled>Pick a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Invoice number</span>
            <input className="input" name="number" required defaultValue={suggested} />
          </label>
          <label className="field">
            <span>Currency</span>
            <CurrencySelect name="currency" defaultValue={pre?.billing_currency ?? "USD"} />
          </label>
          <label className="field">
            <span>Amount</span>
            <input className="input" name="amount" inputMode="decimal" required placeholder="0.00" />
          </label>
          <label className="field">
            <span>Issued on</span>
            <input className="input" type="date" name="issued_on" defaultValue={todayISO()} />
          </label>
          <label className="field">
            <span>Due on</span>
            <input className="input" type="date" name="due_on" />
            <span className="xsmall subtle">Leave empty to use the client&apos;s payment terms.</span>
          </label>
        </div>
        <div className="form-actions">
          <SubmitButton className="btn btn-primary btn-lg" pendingText="Saving…">Save invoice</SubmitButton>
          <Link href="/billing" className="btn btn-lg btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  );
}

function bump(number: string): string {
  const m = number.match(/^(.*?)(\d+)$/);
  if (!m) return "";
  const next = String(Number(m[2]) + 1).padStart(m[2].length, "0");
  return `${m[1]}${next}`;
}
