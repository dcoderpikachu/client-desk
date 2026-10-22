import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles both link styles Supabase can send: ?code= (PKCE) and ?token_hash=&type=.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let error: string | null = null;

  if (code) {
    const res = await supabase.auth.exchangeCodeForSession(code);
    error = res.error?.message ?? null;
  } else if (tokenHash && type) {
    const res = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = res.error?.message ?? null;
  } else {
    error = url.searchParams.get("error_description") ?? "That login link is incomplete.";
  }

  const dest = new URL(error ? "/login" : "/", url.origin);
  if (error) dest.searchParams.set("error", `${error} Request a new link.`);
  return NextResponse.redirect(dest);
}
