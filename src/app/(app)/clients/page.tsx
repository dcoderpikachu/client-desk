import Link from "next/link";
import { IconPlus, IconSearch } from "@/components/Icons";
import { ChannelChip, Flash, HealthChip, sp } from "@/components/ui";
import { ago, dayMonth, lateText, todayISO } from "@/lib/dates";
import { plural, usd } from "@/lib/format";
import { buildClientViews, LEVEL_RANK, type Level } from "@/lib/model";
import { getData } from "@/lib/session";

type Q = Record<string, string | string[] | undefined>;

function href(q: { channel?: string; health?: string; q?: string; status?: string }, patch: Record<string, string | undefined>) {
  const next = { ...q, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v && v !== "all") params.set(k, v);
  const s = params.toString();
  return `/clients${s ? `?${s}` : ""}`;
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Q> }) {
  const raw = await searchParams;
  const q = { channel: sp(raw.channel), health: sp(raw.health), q: sp(raw.q), status: sp(raw.status) };
  const d = await getData();
  const today = todayISO();
  const views = buildClientViews(d, today).filter((v) => v.client.status !== "churned");

  const term = (q.q ?? "").toLowerCase();
  const rows = views
    .filter((v) => (q.status === "paused" ? v.client.status === "paused" : true))
    .filter((v) => !q.channel || q.channel === "all" || v.channels.includes(q.channel as "direct" | "upwork"))
    .filter((v) => !q.health || q.health === "all" || v.health === q.health)
    .filter(
      (v) =>
        !term ||
        v.client.name.toLowerCase().includes(term) ||
        v.brands.some((b) => b.name.toLowerCase().includes(term)),
    )
    .sort((a, b) => LEVEL_RANK[b.health] - LEVEL_RANK[a.health] || a.client.name.localeCompare(b.client.name));

  const countCh = (c: string) => views.filter((v) => v.channels.includes(c as "direct" | "upwork")).length;
  const countH = (h: Level) => views.filter((v) => v.health === h).length;
  const chActive = q.channel ?? "all";
  const hActive = q.health ?? "all";

  return (
    <>
      <header className="page-head">
        <div className="stack gap-6">
          <h1 className="h1">Clients</h1>
          <p className="lead">{plural(views.length, "paying client")}. Sorted so trouble floats to the top.</p>
        </div>
        <Link href="/clients/new" className="btn btn-primary btn-lg">
          <IconPlus size={16} />
          Add client
        </Link>
      </header>

      <Flash error={sp(raw.error)} ok={sp(raw.ok)} />

      <div className="row wrap gap-12" style={{ gap: "12px 16px" }}>
        <form className="search" action="/clients" role="search">
          <IconSearch />
          {q.channel && <input type="hidden" name="channel" value={q.channel} />}
          {q.health && <input type="hidden" name="health" value={q.health} />}
          <label className="visually-hidden" htmlFor="client-search">Search clients</label>
          <input id="client-search" type="search" name="q" defaultValue={q.q} placeholder="Search clients or brands" />
        </form>
        <nav className="seg" aria-label="Channel">
          {[
            ["all", "All", views.length],
            ["direct", "Direct", countCh("direct")],
            ["upwork", "Upwork", countCh("upwork")],
          ].map(([k, label, c]) => (
            <Link key={k} href={href(q, { channel: String(k) })} aria-current={chActive === k ? "true" : undefined}>
              {label} <span className="subtle">{c}</span>
            </Link>
          ))}
        </nav>
        <nav className="seg" aria-label="Health">
          <Link href={href(q, { health: "all" })} aria-current={hActive === "all" ? "true" : undefined}>Any health</Link>
          {(
            [
              ["risk", "At risk", "var(--risk)"],
              ["watch", "Watch", "var(--watch)"],
              ["good", "Healthy", "var(--good)"],
            ] as const
          ).map(([k, label, color]) => (
            <Link key={k} href={href(q, { health: k })} aria-current={hActive === k ? "true" : undefined}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 8, background: color }} />
              {label} {countH(k)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="card" style={{ padding: "6px 14px 10px", gap: 0 }}>
        <div className="table-box">
          <table className="table" style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th scope="col" style={{ paddingTop: 12 }}>Client</th>
                <th scope="col" style={{ paddingTop: 12 }}>Channel</th>
                <th scope="col" style={{ paddingTop: 12 }}>Health</th>
                <th scope="col" style={{ paddingTop: 12 }}>Engagement</th>
                <th scope="col" className="r" style={{ paddingTop: 12 }}>Monthly value</th>
                <th scope="col" className="r" style={{ paddingTop: 12 }}>Outstanding</th>
                <th scope="col" style={{ paddingTop: 12 }}>Last contact</th>
                <th scope="col" style={{ paddingTop: 12 }}>Next call</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => {
                const overdue = v.client.status === "active" && v.overdueDays > 0;
                return (
                  <tr key={v.client.id}>
                    <td>
                      <div className="cell-stack">
                        <Link href={`/clients/${v.client.id}`} className="table-name">{v.client.name}</Link>
                        <span className="small subtle">
                          {[v.client.country, v.brands.length ? plural(v.brands.length, "brand") : null].filter(Boolean).join(", ")}
                          {v.client.status === "paused" ? " · Paused" : ""}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="row wrap gap-6">
                        {v.channels.length ? v.channels.map((c) => <ChannelChip key={c} channel={c} />) : <span className="subtle">None</span>}
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack" style={{ gap: 5, alignItems: "flex-start" }}>
                        <HealthChip level={v.health} />
                        <span className="small muted">{v.healthReason}</span>
                      </div>
                    </td>
                    <td className="muted">{v.engagementSummary}</td>
                    <td className="r">
                      <div className="cell-stack r">
                        <span className="num" style={{ fontSize: 17, fontWeight: 700 }}>{v.monthly.usd === null ? "None" : usd(v.monthly.usd)}</span>
                        <span className="xsmall subtle">{v.monthly.sub}</span>
                      </div>
                    </td>
                    <td className="r">
                      <div className="cell-stack r">
                        <span className="num strong">{v.outstanding.usd > 0.5 ? usd(v.outstanding.usd) : "Nothing"}</span>
                        <span className="xsmall" style={{ color: v.outstandingNote.late ? "var(--risk)" : "var(--ink-3)" }}>{v.outstandingNote.text}</span>
                      </div>
                    </td>
                    <td className="muted">{v.lastContact ? ago(v.lastContact, today) : "Never"}</td>
                    <td style={{ color: overdue ? "var(--risk)" : "var(--ink)", fontWeight: 500 }}>
                      {v.client.status === "paused" ? <span className="subtle">Paused</span> : overdue ? lateText(v.overdueDays) : `By ${dayMonth(v.nextDue)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <p className="muted" style={{ padding: "28px 16px", textAlign: "center" }}>
              {views.length ? "No clients match those filters. Try All." : "No clients yet. Add your first one to get started."}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
