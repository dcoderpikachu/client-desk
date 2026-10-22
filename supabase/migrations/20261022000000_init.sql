-- Client Desk: initial schema
-- Everything is owner-only. The owner is whoever's email is in public.owners.

create extension if not exists pgcrypto;

-- Owner allow-list ---------------------------------------------------------
create table public.owners (
  email text primary key
);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.owners o
    where lower(o.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Clients ------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  country text,
  billing_currency text not null default 'USD',
  payment_terms_days int not null default 14,
  status text not null default 'active' check (status in ('active', 'paused', 'churned')),
  client_since date,
  cadence_days int not null default 14 check (cadence_days > 0),
  cadence_note text,
  asana_url text,
  upwork_name text,            -- how this client appears in Upwork exports
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  store_url text
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  role text,
  email text,
  is_primary boolean not null default false
);

create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text,
  type text not null check (type in ('retainer', 'hourly', 'fixed')),
  channel text not null check (channel in ('direct', 'upwork')),
  upwork_contract_id text,
  currency text not null default 'USD',
  monthly_value numeric(12, 2),   -- retainers
  hourly_rate numeric(12, 2),     -- hourly
  total_value numeric(12, 2),     -- fixed projects
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now()
);

-- Relationship -------------------------------------------------------------
create table public.touchpoints (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  occurred_on date not null default current_date,
  type text not null default 'call' check (type in ('call', 'meeting', 'async')),
  sentiment text check (sentiment in ('good', 'neutral', 'concerned')),
  summary text,
  created_at timestamptz not null default now()
);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  touchpoint_id uuid references public.touchpoints (id) on delete set null,
  text text not null,
  due_on date,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.health_ratings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  rating text not null check (rating in ('green', 'amber', 'red')),
  reason text,
  created_at timestamptz not null default now()
);

-- Money: direct channel ----------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  engagement_id uuid references public.engagements (id) on delete set null,
  number text not null unique,
  currency text not null default 'USD',
  amount numeric(12, 2) not null check (amount >= 0),
  issued_on date not null,
  due_on date not null,
  status text not null default 'sent' check (status in ('sent', 'partially_paid', 'paid', 'void')),
  paid_on date,
  amount_received_inr numeric(14, 2),
  created_at timestamptz not null default now()
);

-- Money: Upwork channel ----------------------------------------------------
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  paid_on date not null,
  usd_withdrawn numeric(12, 2) not null,
  inr_received numeric(14, 2),
  source_ref text unique,
  note text,
  created_at timestamptz not null default now()
);

create table public.upwork_earnings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  engagement_id uuid references public.engagements (id) on delete set null,
  kind text not null default 'hourly' check (kind in ('hourly', 'milestone', 'bonus')),
  period_start date,
  period_end date not null,
  hours numeric(8, 2),
  gross_usd numeric(12, 2) not null,
  fee_usd numeric(12, 2) not null default 0,
  net_usd numeric(12, 2) generated always as (gross_usd - fee_usd) stored,
  status text not null default 'pending' check (status in ('pending', 'available', 'withdrawn')),
  payout_id uuid references public.payouts (id) on delete set null,
  source_ref text unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.upwork_charges (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null,
  kind text not null check (kind in ('membership', 'connects', 'withdrawal_fee', 'other')),
  amount_usd numeric(12, 2) not null,
  description text,
  payout_id uuid references public.payouts (id) on delete set null,
  source_ref text unique,
  created_at timestamptz not null default now()
);

-- Exchange rates: units of currency per 1 USD --------------------------------
create table public.fx_rates (
  day date not null,
  currency text not null,
  per_usd numeric(14, 6) not null,
  primary key (day, currency)
);

-- Settings -----------------------------------------------------------------
create table public.settings (
  key text primary key,
  value jsonb not null
);

-- Indexes ------------------------------------------------------------------
create index on public.brands (client_id);
create index on public.contacts (client_id);
create index on public.engagements (client_id);
create index on public.touchpoints (client_id, occurred_on desc);
create index on public.action_items (client_id) where done_at is null;
create index on public.notes (client_id, created_at desc);
create index on public.health_ratings (client_id, created_at desc);
create index on public.invoices (client_id, issued_on desc);
create index on public.upwork_earnings (client_id, period_end desc);
create index on public.upwork_earnings (payout_id);
create index on public.upwork_charges (occurred_on);

-- Row level security: owner only ------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'clients', 'brands', 'contacts', 'engagements', 'touchpoints', 'action_items',
    'notes', 'health_ratings', 'invoices', 'payouts', 'upwork_earnings',
    'upwork_charges', 'fx_rates', 'settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy owner_all on public.%I for all to authenticated using (public.is_owner()) with check (public.is_owner())',
      t
    );
  end loop;
end $$;

alter table public.owners enable row level security;
-- No policies on owners: only the service role (and is_owner(), which is security definer) can read it.

insert into public.owners (email) values ('kshitij.message@gmail.com');

insert into public.settings (key, value) values
  ('thresholds', '{"concentration": 0.30, "payment_amber_days": 1, "payment_red_days": 31, "trend_amber_drop": 0.30, "trend_red_drop": 0.60, "trend_quiet_days": 14, "rating_stale_days": 30}');
