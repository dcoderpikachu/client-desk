-- Upwork lists the service fee as its own transaction. Remember which fee was applied to
-- which earning so re-importing an overlapping export never double-counts a fee.
alter table public.upwork_earnings add column fee_ref text;
create unique index upwork_earnings_fee_ref_key on public.upwork_earnings (fee_ref) where fee_ref is not null;
