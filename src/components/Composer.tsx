"use client";

import { useRef, useState } from "react";
import { logEntry } from "@/app/actions";
import { IconPlus, IconX } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";

type Row = { key: number };

export function Composer({
  clientId,
  clients,
  returnTo,
  today,
  defaultKind = "call",
}: {
  clientId?: string;
  clients?: { id: string; name: string }[];
  returnTo: string;
  today: string;
  defaultKind?: "call" | "note";
}) {
  const [kind, setKind] = useState<"call" | "meeting" | "async" | "note">(defaultKind);
  const [sentiment, setSentiment] = useState<"good" | "neutral" | "concerned" | "">("");
  const [rows, setRows] = useState<Row[]>([]);
  const next = useRef(1);
  const isNote = kind === "note";

  return (
    <form action={logEntry} className="stack gap-12 inset" style={{ padding: 16 }} id="log">
      {clientId && <input type="hidden" name="client_id" value={clientId} />}
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="kind" value={kind} />
      {sentiment && <input type="hidden" name="sentiment" value={sentiment} />}

      {clients && (
        <label className="field">
          <span>Client</span>
          <select className="select" name="client_id" required defaultValue="">
            <option value="" disabled>Pick a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}

      <div className="row wrap between gap-10">
        <div className="seg" role="group" aria-label="Type">
          {(
            [
              ["call", "Call"],
              ["meeting", "Meeting"],
              ["async", "Async"],
              ["note", "Note"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {label}
            </button>
          ))}
        </div>
        {!isNote && (
          <label className="row gap-8 small muted">
            <span>Date</span>
            <input className="input" type="date" name="occurred_on" defaultValue={today} max={today} style={{ width: 160, minHeight: 40 }} />
          </label>
        )}
      </div>

      <label className="field">
        <span className="visually-hidden">{isNote ? "Note" : "What happened"}</span>
        <textarea
          className="textarea"
          name="summary"
          rows={3}
          placeholder={isNote ? "Write a note…" : "What happened on the call?"}
        />
      </label>

      <fieldset className="stack gap-8">
        <legend>Action items</legend>
        {rows.map((r, i) => (
          <div key={r.key} className="row wrap gap-8">
            <label style={{ flex: "1 1 240px", display: "flex" }}>
              <span className="visually-hidden">Action item {i + 1}</span>
              <input className="input" name="item_text" placeholder="What did you promise?" autoFocus={i === rows.length - 1} />
            </label>
            <label style={{ display: "flex" }}>
              <span className="visually-hidden">Due date for item {i + 1}</span>
              <input className="input" type="date" name="item_due" min={today} style={{ width: 160 }} />
            </label>
            <button
              type="button"
              className="btn btn-ghost"
              aria-label={`Remove action item ${i + 1}`}
              style={{ width: 44, padding: 0, border: 0 }}
              onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
            >
              <IconX />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-dashed"
          style={{ alignSelf: "flex-start" }}
          onClick={() => setRows([...rows, { key: next.current++ }])}
        >
          <IconPlus size={16} />
          Add action item
        </button>
      </fieldset>

      <div className="row wrap between gap-10">
        {!isNote ? (
          <div className="seg" role="group" aria-label="How did it feel">
            {(
              [
                ["good", "Good"],
                ["neutral", "Neutral"],
                ["concerned", "Concerned"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={sentiment === k} onClick={() => setSentiment(sentiment === k ? "" : k)}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <SubmitButton className="btn btn-primary" pendingText="Saving…">Save to timeline</SubmitButton>
      </div>
    </form>
  );
}
