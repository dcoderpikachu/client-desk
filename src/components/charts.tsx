import { inrShort, usd, usdCompact } from "@/lib/format";
import type { MonthPoint } from "@/lib/model";

function niceStep(max: number, ticks = 4): number {
  const raw = max / ticks;
  const steps = [1, 2, 2.5, 5, 10];
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  for (const s of steps) if (s * mag >= raw) return s * mag;
  return 10 * mag;
}

export function RevenueChart({ months }: { months: MonthPoint[] }) {
  const H = 200;
  const max = Math.max(1, ...months.map((m) => Math.max(m.direct.usd + m.upwork.usd, m.collected.usd)));
  const step = niceStep(max);
  const top = step * 4;
  const y = (v: number) => Math.round((v / top) * H);
  const first = months[0];
  const last = months[months.length - 1];
  const totalFirst = first.direct.usd + first.upwork.usd;
  const totalLast = last.direct.usd + last.upwork.usd;

  return (
    <div
      role="img"
      aria-label={`Monthly revenue went from ${usd(totalFirst)} in ${first.label} to ${usd(totalLast)} in ${last.label} so far.`}
      className="chart"
      style={{ height: H + 32 }}
    >
      <div aria-hidden="true">
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k}>
            <div className={`chart-grid${k === 0 ? " base" : ""}`} style={{ top: H - y(step * k) }} />
            <span className="chart-tick" style={{ top: H - y(step * k) }}>{usdCompact(step * k)}</span>
          </div>
        ))}
      </div>
      <div className="chart-bars" style={{ height: H }}>
        {months.map((m) => {
          const total = m.direct.usd + m.upwork.usd;
          const tip =
            `${m.label}: revenue ${usd(total)} (${inrShort(m.direct.inr + m.upwork.inr)}). ` +
            `Direct ${usd(m.direct.usd)}, Upwork ${usd(m.upwork.usd)}. ` +
            `Collected ${usd(m.collected.usd)} (${inrShort(m.collected.inr)}).`;
          const uh = y(m.upwork.usd);
          const dh = y(m.direct.usd);
          return (
            <div key={m.key} className="chart-col" style={{ height: H }} title={tip}>
              {uh > 0 && <div className={`bar${uh > 0 ? " bar-top" : ""}`} style={{ height: uh, background: "var(--upwork)" }} />}
              {dh > 0 && <div className={`bar${uh === 0 ? " bar-top" : ""}`} style={{ height: dh, background: "var(--direct)" }} />}
              {m.collected.usd > 0 && <div className="chart-dot" style={{ bottom: y(m.collected.usd) }} />}
            </div>
          );
        })}
      </div>
      <div className="chart-labels" style={{ top: H + 10 }} aria-hidden="true">
        {months.map((m) => (
          <span key={m.key}>{m.label}</span>
        ))}
      </div>
    </div>
  );
}

export function WeeklyBars({
  points,
  unit,
  highlightFrom,
  baseline,
}: {
  points: { key: string; label: string; value: number; tip: string }[];
  unit: "h" | "usd";
  highlightFrom: number;
  baseline: number | null;
}) {
  const H = 150;
  const max = Math.max(1, ...points.map((p) => p.value), baseline ?? 0) * 1.15;
  const y = (v: number) => Math.round((v / max) * H);
  const fmt = (v: number) => (unit === "h" ? `${Math.round(v * 10) / 10} h` : usdCompact(v));
  const last = points[points.length - 1];
  return (
    <div role="img" aria-label={`Weekly billing over the last ${points.length} weeks, most recent ${last ? fmt(last.value) : "none"}.`} className="chart" style={{ height: H + 28 }}>
      <div className="chart-grid base" style={{ left: 0, top: H }} aria-hidden="true" />
      {baseline !== null && baseline > 0 && (
        <div
          aria-hidden="true"
          style={{ position: "absolute", left: 0, right: 0, top: H - y(baseline), borderTop: "2px dashed var(--ink-2)", zIndex: 1, opacity: 0.6 }}
        />
      )}
      <div className="chart-bars" style={{ left: 0, height: H }}>
        {points.map((p, i) => (
          <div key={p.key} className="chart-col" style={{ height: H, gap: 4 }} title={p.tip}>
            {i === points.length - 1 && <span className="xsmall muted">{fmt(p.value)}</span>}
            <div className="bar bar-top" style={{ height: Math.max(p.value > 0 ? 2 : 0, y(p.value)), maxWidth: 22, background: i >= highlightFrom ? "var(--upwork)" : "var(--bar-muted)" }} />
          </div>
        ))}
      </div>
      <div className="chart-labels" style={{ left: 0, top: H + 8 }} aria-hidden="true">
        {points.map((p) => (
          <span key={p.key}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

export function MonthlyBars({ points }: { points: { key: string; label: string; usd: number; tip: string }[] }) {
  const H = 150;
  const max = Math.max(1, ...points.map((p) => p.usd)) * 1.1;
  const y = (v: number) => Math.round((v / max) * H);
  return (
    <div role="img" aria-label="Billed per month over the last 12 months." className="chart" style={{ height: H + 28 }}>
      <div className="chart-grid base" style={{ left: 0, top: H }} aria-hidden="true" />
      <div className="chart-bars" style={{ left: 0, height: H }}>
        {points.map((p) => (
          <div key={p.key} className="chart-col" style={{ height: H }} title={p.tip}>
            <div className="bar bar-top" style={{ height: y(p.usd), maxWidth: 22, background: "var(--direct)" }} />
          </div>
        ))}
      </div>
      <div className="chart-labels" style={{ left: 0, top: H + 8 }} aria-hidden="true">
        {points.map((p) => (
          <span key={p.key}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}
