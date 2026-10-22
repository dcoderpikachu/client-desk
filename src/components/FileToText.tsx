"use client";

import { useState } from "react";

/** Reads a chosen CSV in the browser and puts its text in a hidden field. */
export function FileToText({ name = "csv", label }: { name?: string; label: string }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState("");
  return (
    <div className="stack gap-8">
      <label className="field">
        <span>{label}</span>
        <input
          className="input"
          type="file"
          accept=".csv,text/csv"
          style={{ paddingTop: 10 }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFile(f.name);
            setText(await f.text());
          }}
          required
        />
      </label>
      <input type="hidden" name={name} value={text} />
      {file && <span className="small muted">{file}, {text.split(/\r?\n/).filter(Boolean).length - 1} rows</span>}
    </div>
  );
}
