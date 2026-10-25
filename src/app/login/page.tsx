import { signInWithGoogle } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash, sp } from "@/components/ui";

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  return (
    <main className="auth-wrap">
      <div className="card auth-card" style={{ gap: 20 }}>
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Client Desk</span>
        </div>
        <form action={signInWithGoogle} className="stack gap-14">
          <div className="stack gap-4">
            <h1 className="h2">Sign in</h1>
            <p className="muted small">This desk is private. Use the Google account it&apos;s set up for.</p>
          </div>
          <Flash error={sp(q.error)} />
          <SubmitButton className="btn btn-lg" pendingText="Opening Google…">
            <GoogleMark />
            Continue with Google
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
