"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ALLOWED_EMAILS, SUPABASE_KEY, SUPABASE_URL, isAllowed } from "@/lib/env";
import { addDays, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const str = (fd: FormData, k: string): string => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string): string | null => str(fd, k) || null;
const num = (fd: FormData, k: string): number | null => {
  const v = str(fd, k).replace(/,/g, "");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const date = (fd: FormData, k: string): string | null => {
  const v = str(fd, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

function safePath(p: string | null | undefined, fallback: string): string {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : fallback;
}

function withParam(path: string, key: string, value: string): string {
  const [base, hash] = path.split("#");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${key}=${encodeURIComponent(value)}${hash ? `#${hash}` : ""}`;
}

async function db() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !isAllowed(data.user.email)) redirect("/login");
  return supabase;
}

function done(path: string): never {
  revalidatePath("/", "layout");
  redirect(path);
}

function fail(path: string, message: string): never {
  redirect(withParam(path, "error", message));
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const loginError = (message: string): never => redirect("/login?error=" + encodeURIComponent(message));

export async function signInWithGoogle() {
  // Supabase only builds the Google redirect URL; if the provider is off, Google never
  // gets involved and the user lands on a raw error page. Check first.
  let googleOn = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY }, cache: "no-store" });
    const settings = (await res.json()) as { external?: { google?: boolean } };
    googleOn = Boolean(settings.external?.google);
  } catch {
    // If the check itself fails, carry on and let Supabase report any problem.
  }
  if (!googleOn) loginError("Google sign-in isn't switched on in Supabase yet.");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = h.get("origin") ?? `${proto}://${host}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { prompt: "select_account", login_hint: ALLOWED_EMAILS[0] },
    },
  });
  if (error || !data.url) loginError(error?.message ?? "Couldn't start Google sign-in.");
  redirect(data.url as string);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

function clientFields(fd: FormData) {
  return {
    name: str(fd, "name"),
    legal_name: opt(fd, "legal_name"),
    country: opt(fd, "country"),
    billing_currency: str(fd, "billing_currency") || "USD",
    payment_terms_days: num(fd, "payment_terms_days") ?? 14,
    client_since: date(fd, "client_since"),
    cadence_days: Math.max(1, num(fd, "cadence_days") ?? 14),
    cadence_note: opt(fd, "cadence_note"),
    asana_url: opt(fd, "asana_url"),
    upwork_name: opt(fd, "upwork_name"),
  };
}

function engagementFields(fd: FormData, prefix = "") {
  const type = str(fd, `${prefix}type`) as "retainer" | "hourly" | "fixed";
  const value = num(fd, `${prefix}value`);
  return {
    title: opt(fd, `${prefix}title`),
    type,
    channel: (str(fd, `${prefix}channel`) || "direct") as "direct" | "upwork",
    currency: str(fd, `${prefix}currency`) || "USD",
    monthly_value: type === "retainer" ? value : null,
    hourly_rate: type === "hourly" ? value : null,
    total_value: type === "fixed" ? value : null,
    start_date: date(fd, `${prefix}start_date`) ?? todayISO(),
    end_date: date(fd, `${prefix}end_date`),
    upwork_contract_id: opt(fd, `${prefix}upwork_contract_id`),
  };
}

export async function createClientRecord(fd: FormData) {
  const supabase = await db();
  const fields = clientFields(fd);
  if (!fields.name) fail("/clients/new", "Give the client a name.");
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...fields, client_since: fields.client_since ?? todayISO() })
    .select("id")
    .single();
  if (error || !data) fail("/clients/new", error?.message ?? "Couldn't save the client.");

  const id = data.id as string;
  if (str(fd, "eng_type")) {
    const { error: e2 } = await supabase.from("engagements").insert({ ...engagementFields(fd, "eng_"), client_id: id });
    if (e2) fail(`/clients/${id}`, `Client saved, but the engagement wasn't: ${e2.message}`);
  }
  if (str(fd, "contact_name")) {
    await supabase.from("contacts").insert({
      client_id: id,
      name: str(fd, "contact_name"),
      role: opt(fd, "contact_role"),
      email: opt(fd, "contact_email"),
      is_primary: true,
    });
  }
  for (const b of str(fd, "brands").split(",").map((s) => s.trim()).filter(Boolean)) {
    await supabase.from("brands").insert({ client_id: id, name: b });
  }
  done(`/clients/${id}`);
}

export async function updateClientRecord(fd: FormData) {
  const supabase = await db();
  const id = str(fd, "id");
  const fields = clientFields(fd);
  const status = str(fd, "status") === "paused" ? "paused" : "active";
  if (!fields.name) fail(`/clients/${id}/edit`, "Give the client a name.");
  const { error } = await supabase.from("clients").update({ ...fields, status }).eq("id", id);
  if (error) fail(`/clients/${id}/edit`, error.message);
  done(`/clients/${id}`);
}

export async function setCadence(fd: FormData) {
  const supabase = await db();
  const id = str(fd, "client_id");
  const days = Math.max(1, num(fd, "cadence_days") ?? 14);
  await supabase.from("clients").update({ cadence_days: days, cadence_note: opt(fd, "cadence_note") }).eq("id", id);
  done(`/clients/${id}`);
}

export async function setRating(fd: FormData) {
  const supabase = await db();
  const id = str(fd, "client_id");
  const rating = str(fd, "rating");
  if (!["green", "amber", "red"].includes(rating)) fail(`/clients/${id}#rating`, "Pick green, amber or red.");
  await supabase.from("health_ratings").insert({ client_id: id, rating, reason: opt(fd, "reason") });
  done(`/clients/${id}#rating`);
}

// ---------------------------------------------------------------------------
// Touchpoints, notes, action items
// ---------------------------------------------------------------------------

export async function logEntry(fd: FormData) {
  const supabase = await db();
  const clientId = str(fd, "client_id");
  const back = safePath(opt(fd, "return_to"), clientId ? `/clients/${clientId}` : "/");
  if (!clientId) fail(back, "Pick a client.");

  const kind = str(fd, "kind") || "call";
  const summary = opt(fd, "summary");
  const occurred = date(fd, "occurred_on") ?? todayISO();
  const texts = fd.getAll("item_text").map((v) => String(v).trim());
  const dues = fd.getAll("item_due").map((v) => String(v).trim());
  const items = texts
    .map((text, i) => ({ text, due_on: /^\d{4}-\d{2}-\d{2}$/.test(dues[i] ?? "") ? dues[i] : null }))
    .filter((x) => x.text);

  let touchpointId: string | null = null;
  if (kind === "note") {
    if (!summary && !items.length) fail(back, "Write a note first.");
    if (summary) await supabase.from("notes").insert({ client_id: clientId, body: summary });
  } else {
    const sentiment = opt(fd, "sentiment");
    const { data, error } = await supabase
      .from("touchpoints")
      .insert({
        client_id: clientId,
        occurred_on: occurred,
        type: ["call", "meeting", "async"].includes(kind) ? kind : "call",
        sentiment: sentiment && ["good", "neutral", "concerned"].includes(sentiment) ? sentiment : null,
        summary,
      })
      .select("id")
      .single();
    if (error || !data) fail(back, error?.message ?? "Couldn't save that.");
    touchpointId = data.id as string;
  }

  if (items.length) {
    await supabase.from("action_items").insert(items.map((x) => ({ ...x, client_id: clientId, touchpoint_id: touchpointId })));
  }
  done(withParam(back, "ok", kind === "note" ? "Note saved." : "Saved to the timeline."));
}

export async function toggleActionItem(fd: FormData) {
  const supabase = await db();
  const id = str(fd, "id");
  const markDone = str(fd, "done") === "1";
  await supabase.from("action_items").update({ done_at: markDone ? new Date().toISOString() : null }).eq("id", id);
  done(safePath(opt(fd, "return_to"), "/"));
}

// ---------------------------------------------------------------------------
// Engagements, contacts, brands
// ---------------------------------------------------------------------------

export async function addEngagement(fd: FormData) {
  const supabase = await db();
  const clientId = str(fd, "client_id");
  const fields = engagementFields(fd);
  if (!["retainer", "hourly", "fixed"].includes(fields.type)) fail(`/clients/${clientId}`, "Pick an engagement type.");
  const { error } = await supabase.from("engagements").insert({ ...fields, client_id: clientId });
  if (error) fail(`/clients/${clientId}`, error.message);
  done(`/clients/${clientId}`);
}

export async function endEngagement(fd: FormData) {
  const supabase = await db();
  const clientId = str(fd, "client_id");
  await supabase
    .from("engagements")
    .update({ status: "ended", end_date: date(fd, "end_date") ?? todayISO() })
    .eq("id", str(fd, "id"));
  done(`/clients/${clientId}`);
}

export async function addContact(fd: FormData) {
  const supabase = await db();
  const clientId = str(fd, "client_id");
  if (!str(fd, "name")) fail(`/clients/${clientId}`, "Give the contact a name.");
  const isPrimary = str(fd, "is_primary") === "on";
  if (isPrimary) await supabase.from("contacts").update({ is_primary: false }).eq("client_id", clientId);
  await supabase.from("contacts").insert({
    client_id: clientId,
    name: str(fd, "name"),
    role: opt(fd, "role"),
    email: opt(fd, "email"),
    is_primary: isPrimary,
  });
  done(`/clients/${clientId}`);
}

export async function removeContact(fd: FormData) {
  const supabase = await db();
  await supabase.from("contacts").delete().eq("id", str(fd, "id"));
  done(`/clients/${str(fd, "client_id")}`);
}

export async function addBrand(fd: FormData) {
  const supabase = await db();
  const clientId = str(fd, "client_id");
  if (str(fd, "name")) await supabase.from("brands").insert({ client_id: clientId, name: str(fd, "name"), store_url: opt(fd, "store_url") });
  done(`/clients/${clientId}`);
}

export async function removeBrand(fd: FormData) {
  const supabase = await db();
  await supabase.from("brands").delete().eq("id", str(fd, "id"));
  done(`/clients/${str(fd, "client_id")}`);
}

// ---------------------------------------------------------------------------
// Direct invoices
// ---------------------------------------------------------------------------

export async function addInvoice(fd: FormData) {
  const supabase = await db();
  const clientId = str(fd, "client_id");
  const number = str(fd, "number");
  const amount = num(fd, "amount");
  const issued = date(fd, "issued_on") ?? todayISO();
  if (!clientId || !number || amount === null) fail("/billing/new", "Client, invoice number and amount are all needed.");

  let due = date(fd, "due_on");
  if (!due) {
    const { data: c } = await supabase.from("clients").select("payment_terms_days").eq("id", clientId).single();
    due = addDays(issued, Number(c?.payment_terms_days ?? 14));
  }
  // Link to the engagement it bills when the client has exactly one active direct engagement.
  let engagementId = opt(fd, "engagement_id");
  if (!engagementId) {
    const { data: engs } = await supabase
      .from("engagements")
      .select("id")
      .eq("client_id", clientId)
      .eq("channel", "direct")
      .eq("status", "active");
    if (engs && engs.length === 1) engagementId = engs[0].id as string;
  }
  const { error } = await supabase.from("invoices").insert({
    client_id: clientId,
    engagement_id: engagementId,
    number,
    currency: str(fd, "currency") || "USD",
    amount,
    issued_on: issued,
    due_on: due,
    status: "sent",
  });
  if (error) fail("/billing/new", error.code === "23505" ? `Invoice ${number} already exists.` : error.message);
  done(withParam(safePath(opt(fd, "return_to"), "/billing"), "ok", `Invoice ${number} added.`));
}

export async function markInvoicePaid(fd: FormData) {
  const supabase = await db();
  const id = str(fd, "id");
  const paidOn = date(fd, "paid_on") ?? todayISO();
  const inr = num(fd, "amount_received_inr");
  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_on: paidOn, amount_received_inr: inr })
    .eq("id", id);
  if (error) fail("/billing", error.message);
  done("/billing?ok=" + encodeURIComponent("Marked paid."));
}

export async function voidInvoice(fd: FormData) {
  const supabase = await db();
  await supabase.from("invoices").update({ status: "void" }).eq("id", str(fd, "id"));
  done("/billing?ok=" + encodeURIComponent("Invoice voided. It no longer counts as revenue."));
}

// ---------------------------------------------------------------------------
// Upwork payouts
// ---------------------------------------------------------------------------

export async function recordPayoutInr(fd: FormData) {
  const supabase = await db();
  const inr = num(fd, "inr_received");
  await supabase.from("payouts").update({ inr_received: inr }).eq("id", str(fd, "id"));
  done(safePath(opt(fd, "return_to"), "/billing/upwork"));
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function saveThresholds(fd: FormData) {
  const supabase = await db();
  const pctv = (k: string, d: number) => {
    const v = num(fd, k);
    return v === null ? d : v / 100;
  };
  const value = {
    concentration: pctv("concentration", 0.3),
    payment_amber_days: 1,
    payment_red_days: (num(fd, "payment_red_days") ?? 30) + 1,
    trend_amber_drop: pctv("trend_amber_drop", 0.3),
    trend_red_drop: pctv("trend_red_drop", 0.6),
    trend_quiet_days: num(fd, "trend_quiet_days") ?? 14,
    rating_stale_days: num(fd, "rating_stale_days") ?? 30,
  };
  await supabase.from("settings").upsert({ key: "thresholds", value });
  done("/settings?ok=" + encodeURIComponent("Thresholds saved."));
}
