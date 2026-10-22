"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importInvoices, type InvoiceImportState } from "@/app/import-actions";
import { FileToText } from "@/components/FileToText";
import { SubmitButton } from "@/components/SubmitButton";

export function InvoiceImport() {
  const [state, action] = useActionState<InvoiceImportState, FormData>(importInvoices, {});
  return (
    <form action={action} className="card" style={{ maxWidth: 760 }}>
      <FileToText label="CSV file" />
      <label className="row gap-8 small">
        <input type="checkbox" name="create_missing" defaultChecked />
        Create clients that don&apos;t exist yet
      </label>
      {state.message && <p className={`flash ${state.ok ? "flash-ok" : "flash-error"}`}>{state.message}</p>}
      {state.lines && state.lines.length > 0 && (
        <ul className="small muted" style={{ margin: 0, paddingLeft: 18, maxHeight: 200, overflow: "auto" }}>
          {state.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
      <div className="form-actions">
        <SubmitButton className="btn btn-primary btn-lg" pendingText="Importing…">Import invoices</SubmitButton>
        {state.ok && <Link href="/billing" className="btn btn-lg">See invoices</Link>}
      </div>
    </form>
  );
}
