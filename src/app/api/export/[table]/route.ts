import Papa from "papaparse";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "@/lib/env";
import { todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

const ALLOWED = new Set([
  "clients", "engagements", "contacts", "brands", "touchpoints", "action_items", "notes",
  "health_ratings", "invoices", "upwork_earnings", "upwork_charges", "payouts", "fx_rates",
]);

export async function GET(_req: NextRequest, ctx: { params: Promise<{ table: string }> }) {
  const { table } = await ctx.params;
  if (!ALLOWED.has(table)) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !isAllowed(auth.user.email)) {
    return new NextResponse("Sign in first", { status: 401 });
  }

  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + 999);
    if (error) return new NextResponse(error.message, { status: 500 });
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const csv = Papa.unparse(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="client-desk-${table}-${todayISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
