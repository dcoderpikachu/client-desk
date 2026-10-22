import { readFile } from "node:fs/promises";
import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { loadData, normalize, type RawData } from "@/lib/data";
import { ALLOWED_EMAIL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Local preview only: when CLIENT_DESK_FIXTURE points at a JSON export, pages render from
// it without Supabase. Never set on Vercel.
const FIXTURE = process.env.CLIENT_DESK_FIXTURE;

// One Supabase client and one data load per request, shared by layout and page.
export const getSession = cache(async () => {
  const supabase = await createClient();
  if (FIXTURE) return { supabase, user: { id: "fixture", email: ALLOWED_EMAIL } as User };
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
});

export const getData = cache(async () => {
  if (FIXTURE) return normalize(JSON.parse(await readFile(FIXTURE, "utf8")) as RawData);
  const { supabase } = await getSession();
  return loadData(supabase);
});
