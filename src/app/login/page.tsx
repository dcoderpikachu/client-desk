import { signIn } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash, sp } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const sent = sp(q.sent) === "1";
  const error = sp(q.error);

  return (
    <main className="auth-wrap">
      <div className="card auth-card" style={{ gap: 20 }}>
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Client Desk</span>
        </div>
        {sent ? (
          <div className="stack gap-8">
            <h1 className="h2">Check your inbox</h1>
            <p className="muted">
              A login link is on its way. Open it on this device to sign in. The link works once and expires within the hour.
            </p>
            <a href="/login" className="small">Send another link</a>
          </div>
        ) : (
          <form action={signIn} className="stack gap-14">
            <div className="stack gap-4">
              <h1 className="h2">Sign in</h1>
              <p className="muted small">We&apos;ll email you a one-time login link. No password.</p>
            </div>
            <Flash error={error} />
            <label className="field">
              <span>Email</span>
              <input className="input" type="email" name="email" autoComplete="email" required />
            </label>
            <SubmitButton className="btn btn-primary btn-lg" pendingText="Sending…">
              Email me a login link
            </SubmitButton>
          </form>
        )}
      </div>
    </main>
  );
}
