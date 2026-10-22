import Link from "next/link";
import { createClientRecord } from "@/app/actions";
import { ClientFields } from "@/components/ClientFields";
import { EngagementFields } from "@/components/EngagementFields";
import { IconChevronLeft } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash, sp } from "@/components/ui";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  return (
    <>
      <Link href="/clients" className="row gap-6 small strong" style={{ textDecoration: "none", minHeight: 44 }}>
        <IconChevronLeft />
        All clients
      </Link>
      <header className="stack gap-6">
        <h1 className="h1">Add a client</h1>
        <p className="lead">A client is whoever pays you. Brands they manage go underneath.</p>
      </header>
      <Flash error={sp(q.error)} />
      <form action={createClientRecord} className="stack gap-16">
        <section className="card">
          <h2 className="h2">Who they are</h2>
          <ClientFields />
          <label className="field">
            <span>Brands, separated by commas</span>
            <input className="input" name="brands" placeholder="Fjell Outdoor, Hausgold" />
          </label>
        </section>
        <section className="card">
          <h2 className="h2">Main contact</h2>
          <div className="form-grid">
            <label className="field"><span>Name</span><input className="input" name="contact_name" /></label>
            <label className="field"><span>Role</span><input className="input" name="contact_role" /></label>
            <label className="field"><span>Email</span><input className="input" name="contact_email" type="email" /></label>
          </div>
        </section>
        <section className="card">
          <div className="stack gap-4">
            <h2 className="h2">How you bill them</h2>
            <p className="small muted">You can add more engagements later from the client page.</p>
          </div>
          <EngagementFields prefix="eng_" />
        </section>
        <div className="form-actions">
          <SubmitButton className="btn btn-primary btn-lg" pendingText="Saving…">Save client</SubmitButton>
          <Link href="/clients" className="btn btn-lg btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  );
}
