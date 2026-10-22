import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { IconPhone, IconPlus } from "@/components/Icons";
import { NavLinks } from "@/components/NavLinks";
import { todayISO } from "@/lib/dates";
import { AGENCY_NAME, ALLOWED_EMAIL, OWNER_NAME, OWNER_SHORT } from "@/lib/env";
import { getData, getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  if ((user.email ?? "").toLowerCase() !== ALLOWED_EMAIL) {
    return (
      <main className="auth-wrap">
        <div className="card auth-card">
          <h1 className="h2">This desk is private</h1>
          <p className="muted">You&apos;re signed in as {user.email}, which doesn&apos;t have access.</p>
          <form action={signOut}>
            <button className="btn">Sign out</button>
          </form>
        </div>
      </main>
    );
  }

  const d = await getData();
  const today = todayISO();
  const clientCount = d.clients.filter((c) => c.status !== "churned").length;
  const lateCount = d.invoices.filter((i) => (i.status === "sent" || i.status === "partially_paid") && i.due_on < today).length;

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>
          <div className="brand-mark" aria-hidden="true" />
          <div className="stack gap-2">
            <span className="brand-name">Client Desk</span>
            <span className="xsmall subtle">{AGENCY_NAME}</span>
          </div>
        </Link>
        <NavLinks clientCount={clientCount} lateCount={lateCount} />
        <div className="quick">
          <Link href="/log" className="btn btn-primary">
            <IconPhone size={16} />
            Log a call
          </Link>
          <Link href="/billing/new" className="btn">
            <IconPlus size={16} />
            Add invoice
          </Link>
        </div>
        <div className="me">
          <div className="avatar" aria-hidden="true">{OWNER_SHORT}</div>
          <div className="stack gap-2 grow">
            <span className="small strong">{OWNER_NAME}</span>
            <form action={signOut}>
              <button className="linkish xsmall" style={{ color: "var(--ink-3)" }}>Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
