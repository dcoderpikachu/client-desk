import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Google sends people back here via Supabase with ?code= (or ?error= if they cancelled).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const fail = (message: string) => {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set("error", message);
    return NextResponse.redirect(dest);
  };

  if (!code) {
    const reason = url.searchParams.get("error_description") ?? url.searchParams.get("error");
    return fail(reason ? `Google sign-in didn't finish: ${reason}` : "Google sign-in didn't finish. Try again.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(`${error.message} Try again.`);

  if (!isAllowed(data.user?.email)) {
    await supabase.auth.signOut();
    return fail(`${data.user?.email ?? "That account"} doesn't have access to this desk.`);
  }

  return NextResponse.redirect(new URL("/", url.origin));
}
