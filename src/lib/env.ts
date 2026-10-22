// Public values: the publishable key is designed to ship to browsers, and every table is
// protected by owner-only row level security. Env vars override these defaults.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://jupojqcseesuglwabomj.supabase.co";

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_wQ0kuF3-voHTbK0Ylck_Aw_vTezTimn";

// Only this address can request a login link. The database enforces the same rule
// independently through the public.owners table.
export const ALLOWED_EMAIL = (process.env.ALLOWED_EMAIL ?? "kshitij.message@gmail.com").toLowerCase();

export const OWNER_NAME = process.env.OWNER_NAME ?? "Kshitij Tripathi";
export const OWNER_SHORT = process.env.OWNER_SHORT ?? "KT";
export const AGENCY_NAME = process.env.AGENCY_NAME ?? "Script Commerce";
