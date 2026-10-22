"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importUpwork, previewUpwork, type UpworkState } from "@/app/import-actions";
import { FileToText } from "@/components/FileToText";
import { SubmitButton } from "@/components/SubmitButton";

const fmt = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function UpworkImport() {
  const [preview, previewAction] = useActionState<UpworkState, FormData>(previewUpwork, { step: "upload" });
  const [result, importAction] = useActionState<UpworkState, FormData>(importUpwork, { step: "upload" });

  if (result.step === "done") {
    return (
      <section className="card" style={{ maxWidth: 760 }}>
        <h2 className="h2">Imported</h2>
        <ul className="stack gap-4" style={{ margin: 0, paddingLeft: 18 }}>
          {result.result?.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
        <div className="form-actions">
          <Link href="/billing/upwork" className="btn btn-primary btn-lg">See Upwork billing</Link>
        </div>
      </section>
    );
  }

  if (preview.step === "preview") {
    return (
      <form action={importAction} className="stack gap-16" style={{ maxWidth: 760 }}>
        <input type="hidden" name="csv" value={preview.csv} />
        <section className="card">
          <div className="stack gap-4">
            <h2 className="h2">What&apos;s in the file</h2>
            <p className="small muted">
              {preview.range?.from} to {preview.range?.to}. Anything already imported is skipped.
            </p>
          </div>
          <table className="table num">
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col" className="r">Rows</th>
                <th scope="col" className="r">Total</th>
              </tr>
            </thead>
            <tbody>
              {preview.summary?.map((s) => (
                <tr key={s.kind}>
                  <td>{s.kind}</td>
                  <td className="r">{s.count}</td>
                  <td className="r">{fmt(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.result?.map((l, i) => (
            <p key={i} className="small muted">{l}</p>
          ))}
        </section>
        {preview.teams && preview.teams.length > 0 && (
          <section className="card">
            <div className="stack gap-4">
              <h2 className="h2">Match Upwork clients</h2>
              <p className="small muted">Each name from Upwork goes to one of your clients. Your choice is remembered for next month.</p>
            </div>
            <div className="stack gap-10">
              {preview.teams.map((t, i) => (
                <label key={t.name} className="row wrap gap-12" style={{ justifyContent: "space-between" }}>
                  <span className="strong">{t.name}</span>
                  <select className="select" name={`map_${i}`} defaultValue={t.suggested} style={{ maxWidth: 320 }}>
                    <option value="new">Create a new client</option>
                    <option value="skip">Skip these rows</option>
                    {preview.clients?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>
        )}
        {result.error && <p className="flash flash-error">{result.error}</p>}
        <div className="form-actions">
          <SubmitButton className="btn btn-primary btn-lg" pendingText="Importing…">Import</SubmitButton>
          <Link href="/billing/upwork/import" className="btn btn-lg btn-ghost">Start over</Link>
        </div>
      </form>
    );
  }

  return (
    <form action={previewAction} className="card" style={{ maxWidth: 760 }}>
      <FileToText label="Upwork transaction history (CSV)" />
      {preview.error && <p className="flash flash-error">{preview.error}</p>}
      <div className="form-actions">
        <SubmitButton className="btn btn-primary btn-lg" pendingText="Reading…">Check the file</SubmitButton>
      </div>
    </form>
  );
}
