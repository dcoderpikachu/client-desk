import Link from "next/link";
import { IconChevronLeft } from "@/components/Icons";
import { InvoiceImport } from "@/components/InvoiceImport";

export default function ImportInvoicesPage() {
  return (
    <>
      <Link href="/billing" className="row gap-6 small strong" style={{ textDecoration: "none", minHeight: 44, alignSelf: "flex-start" }}>
        <IconChevronLeft />
        Billing
      </Link>
      <header className="stack gap-6">
        <h1 className="h1">Import past invoices</h1>
        <p className="lead">Bring in the last 12 months from Wise or your Google Sheet in one go. Invoices already here are skipped, so it&apos;s safe to run twice.</p>
      </header>
      <section className="card" style={{ maxWidth: 760, gap: 10 }}>
        <h2 className="h3">What the file needs</h2>
        <p className="small muted">
          One row per invoice with these columns, in any order: <b>Invoice number</b>, <b>Client</b>, <b>Amount</b>, <b>Issue date</b>. Optional:{" "}
          <b>Currency</b>, <b>Due date</b>, <b>Status</b>, <b>Paid date</b>, <b>INR received</b>. Column names don&apos;t have to match exactly. Dates are safest as
          2026-10-21; 21/10/2026 is read day first.
        </p>
      </section>
      <InvoiceImport />
    </>
  );
}
