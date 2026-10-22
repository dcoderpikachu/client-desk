import Link from "next/link";
import { notFound } from "next/navigation";
import { updateClientRecord } from "@/app/actions";
import { ClientFields } from "@/components/ClientFields";
import { IconChevronLeft } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash, sp } from "@/components/ui";
import { getData } from "@/lib/session";

export default async function EditClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const d = await getData();
  const client = d.clients.find((c) => c.id === id);
  if (!client) notFound();

  return (
    <>
      <Link href={`/clients/${id}`} className="row gap-6 small strong" style={{ textDecoration: "none", minHeight: 44 }}>
        <IconChevronLeft />
        {client.name}
      </Link>
      <h1 className="h1">Edit client</h1>
      <Flash error={sp(q.error)} />
      <form action={updateClientRecord} className="stack gap-16">
        <input type="hidden" name="id" value={client.id} />
        <section className="card">
          <ClientFields client={client} />
          <fieldset>
            <legend>Status</legend>
            <div className="seg seg-inset">
              <label>
                <input type="radio" name="status" value="active" defaultChecked={client.status !== "paused"} />
                Active
              </label>
              <label>
                <input type="radio" name="status" value="paused" defaultChecked={client.status === "paused"} />
                Paused
              </label>
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>Paused clients stay in your lists but stop raising call and billing-trend alerts.</p>
          </fieldset>
        </section>
        <div className="form-actions">
          <SubmitButton className="btn btn-primary btn-lg" pendingText="Saving…">Save changes</SubmitButton>
          <Link href={`/clients/${id}`} className="btn btn-lg btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  );
}
