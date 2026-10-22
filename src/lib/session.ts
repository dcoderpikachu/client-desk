import { cache } from "react";
import { loadData } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

// One Supabase client and one data load per request, shared by layout and page.
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
});

export const getData = cache(async () => {
  const { supabase } = await getSession();
  return loadData(supabase);
});
