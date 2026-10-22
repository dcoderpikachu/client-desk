import type { Client } from "@/lib/types";

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF", "SEK", "DKK"];

export function CurrencySelect({ name, defaultValue = "USD", id }: { name: string; defaultValue?: string; id?: string }) {
  return (
    <select className="select" name={name} id={id} defaultValue={defaultValue}>
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

export function CadenceSelect({ name, defaultValue = 14 }: { name: string; defaultValue?: number }) {
  const presets = [7, 14, 21, 28, 30];
  const options = presets.includes(defaultValue) ? presets : [...presets, defaultValue].sort((a, b) => a - b);
  const label = (d: number) => (d === 7 ? "Every week" : d === 30 ? "Every month" : d % 7 === 0 ? `Every ${d / 7} weeks` : `Every ${d} days`);
  return (
    <select className="select" name={name} defaultValue={String(defaultValue)}>
      {options.map((d) => (
        <option key={d} value={d}>{label(d)}</option>
      ))}
    </select>
  );
}

export function ClientFields({ client }: { client?: Client }) {
  return (
    <div className="form-grid">
      <label className="field">
        <span>Client name (whoever pays you)</span>
        <input className="input" name="name" required defaultValue={client?.name} />
      </label>
      <label className="field">
        <span>Legal name</span>
        <input className="input" name="legal_name" defaultValue={client?.legal_name ?? ""} />
      </label>
      <label className="field">
        <span>Country</span>
        <input className="input" name="country" defaultValue={client?.country ?? ""} />
      </label>
      <label className="field">
        <span>Billing currency</span>
        <CurrencySelect name="billing_currency" defaultValue={client?.billing_currency ?? "USD"} />
      </label>
      <label className="field">
        <span>Payment terms, days</span>
        <input className="input" name="payment_terms_days" type="number" min={0} defaultValue={client?.payment_terms_days ?? 14} />
      </label>
      <label className="field">
        <span>Client since</span>
        <input className="input" name="client_since" type="date" defaultValue={client?.client_since ?? ""} />
      </label>
      <label className="field">
        <span>Call cadence</span>
        <CadenceSelect name="cadence_days" defaultValue={client?.cadence_days ?? 14} />
      </label>
      <label className="field">
        <span>Cadence note</span>
        <input className="input" name="cadence_note" placeholder="Fortnightly check-in with…" defaultValue={client?.cadence_note ?? ""} />
      </label>
      <label className="field">
        <span>Asana project link</span>
        <input className="input" name="asana_url" type="url" defaultValue={client?.asana_url ?? ""} />
      </label>
      <label className="field">
        <span>Name in Upwork exports</span>
        <input className="input" name="upwork_name" placeholder="Only for Upwork clients" defaultValue={client?.upwork_name ?? ""} />
      </label>
    </div>
  );
}
