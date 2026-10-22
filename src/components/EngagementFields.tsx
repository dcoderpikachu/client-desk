"use client";

import { useState } from "react";
import { CURRENCIES } from "@/components/ClientFields";

export function EngagementFields({ prefix = "", required = false }: { prefix?: string; required?: boolean }) {
  const [type, setType] = useState(required ? "retainer" : "");
  const [channel, setChannel] = useState("direct");
  const valueLabel = type === "retainer" ? "Monthly value" : type === "hourly" ? "Hourly rate" : "Total project value";

  return (
    <div className="form-grid">
      <label className="field">
        <span>Engagement type</span>
        <select className="select" name={`${prefix}type`} value={type} onChange={(e) => setType(e.target.value)} required={required}>
          {!required && <option value="">None yet</option>}
          <option value="retainer">Retainer</option>
          <option value="hourly">Monthly hourly</option>
          <option value="fixed">Fixed project</option>
        </select>
      </label>
      {type && (
        <>
          <label className="field">
            <span>Billed through</span>
            <select className="select" name={`${prefix}channel`} value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="direct">Direct (Wise invoice)</option>
              <option value="upwork">Upwork</option>
            </select>
          </label>
          <label className="field">
            <span>Currency</span>
            <select className="select" name={`${prefix}currency`} defaultValue="USD" key={channel}>
              {(channel === "upwork" ? ["USD"] : CURRENCIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{valueLabel}</span>
            <input className="input" name={`${prefix}value`} inputMode="decimal" placeholder="0" />
          </label>
          <label className="field">
            <span>Title</span>
            <input className="input" name={`${prefix}title`} placeholder="White-label retainer" />
          </label>
          <label className="field">
            <span>Start date</span>
            <input className="input" name={`${prefix}start_date`} type="date" />
          </label>
          <label className="field">
            <span>{type === "fixed" ? "Expected end" : "End or renewal date"}</span>
            <input className="input" name={`${prefix}end_date`} type="date" />
          </label>
          {channel === "upwork" && (
            <label className="field">
              <span>Upwork contract ID</span>
              <input className="input" name={`${prefix}upwork_contract_id`} />
            </label>
          )}
        </>
      )}
    </div>
  );
}
