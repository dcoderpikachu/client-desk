import { Composer } from "@/components/Composer";
import { Flash, sp } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import { getData } from "@/lib/session";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const d = await getData();
  const clients = d.clients.filter((c) => c.status !== "churned").map((c) => ({ id: c.id, name: c.name }));
  return (
    <>
      <header className="stack gap-6">
        <h1 className="h1">Log a call</h1>
        <p className="lead">Thirty seconds now saves a missed follow-up later.</p>
      </header>
      <Flash error={sp(q.error)} ok={sp(q.ok)} />
      <section className="card" style={{ maxWidth: 720 }}>
        <Composer clients={clients} returnTo="/log" today={todayISO()} />
      </section>
    </>
  );
}
