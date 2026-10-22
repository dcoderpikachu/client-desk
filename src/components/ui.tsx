import { inr, inrShort, usd } from "@/lib/format";
import { LEVEL_LABEL, type Level } from "@/lib/model";

export function HealthChip({ level, large }: { level: Level; large?: boolean }) {
  const cls = level === "good" ? "chip-good" : level === "watch" ? "chip-watch" : "chip-risk";
  return (
    <span className={`chip ${cls}${large ? " chip-lg" : ""}`}>
      <span className="dot" aria-hidden="true" />
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function ChannelChip({ channel }: { channel: "direct" | "upwork" }) {
  return (
    <span className="chip chip-neutral" style={{ color: "var(--ink)" }}>
      <span className={`swatch ${channel === "direct" ? "sw-direct" : "sw-upwork"}`} aria-hidden="true" />
      {channel === "direct" ? "Direct" : "Upwork"}
    </span>
  );
}

/** USD first, rupees beneath. */
export function Amount({
  usdValue,
  inrValue,
  size = "md",
  align = "left",
  short = true,
}: {
  usdValue: number;
  inrValue?: number | null;
  size?: "sm" | "md" | "lg" | "xl";
  align?: "left" | "right";
  short?: boolean;
}) {
  const fs = { sm: 15, md: 17, lg: 24, xl: 32 }[size];
  const sub = { sm: 12, md: 12, lg: 13, xl: 14 }[size];
  return (
    <span className="cell-stack num" style={{ alignItems: align === "right" ? "flex-end" : "flex-start" }}>
      <span style={{ fontSize: fs, fontWeight: 700, lineHeight: 1.2 }}>{usd(usdValue)}</span>
      {inrValue !== undefined && inrValue !== null && (
        <span className="muted" style={{ fontSize: sub }}>
          {short ? inrShort(inrValue) : inr(inrValue)}
        </span>
      )}
    </span>
  );
}

export function Flash({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error) return <p className="flash flash-error" role="alert">{error}</p>;
  if (ok) return <p className="flash flash-ok" role="status">{ok}</p>;
  return null;
}

export function Kpi({
  label,
  usdValue,
  inrValue,
  note,
  noteDot,
}: {
  label: string;
  usdValue: number;
  inrValue: number;
  note?: React.ReactNode;
  noteDot?: "risk";
}) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{usd(usdValue)}</span>
      <span className="kpi-inr">{inrShort(inrValue)}</span>
      {note && (
        <span className="kpi-note">
          {noteDot && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 8, background: "var(--risk)" }} />}
          {note}
        </span>
      )}
    </div>
  );
}

export function sp(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
