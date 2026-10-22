-- Daily exchange rates: the database fetches ECB reference rates (via Frankfurter, no key
-- needed) every day at 22:00 India time. Rates are stored as units per 1 USD.
create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

create or replace function private.sync_fx(p_start date default null)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_start date;
  v_end date := (now() at time zone 'Asia/Kolkata')::date;
  v_resp extensions.http_response;
  v_body jsonb;
  v_count int := 0;
begin
  v_start := coalesce(p_start, (select max(day) + 1 from public.fx_rates where currency = 'INR'), v_end - 460);
  if v_start > v_end then
    return 0;
  end if;

  select * into v_resp from extensions.http_get(
    format('https://api.frankfurter.dev/v1/%s..%s?base=USD&symbols=INR,EUR,GBP,CAD,AUD,CHF,SEK,DKK', v_start, v_end)
  );
  if v_resp.status <> 200 then
    raise warning 'fx sync failed: HTTP %', v_resp.status;
    return 0;
  end if;

  v_body := v_resp.content::jsonb;

  insert into public.fx_rates (day, currency, per_usd)
  select d.key::date, r.key, (r.value)::numeric
  from jsonb_each(v_body -> 'rates') d,
       jsonb_each_text(d.value) r
  on conflict (day, currency) do update set per_usd = excluded.per_usd;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.sync_fx(date) from public, anon, authenticated;

select cron.schedule('fx-daily-sync', '30 16 * * *', $$select private.sync_fx()$$);

-- First run: backfill ~15 months.
select private.sync_fx((current_date - 460)::date);
