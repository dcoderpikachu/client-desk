-- The date Upwork recorded the transaction (the work period can end days earlier).
-- Used to decide which monthly withdrawal an earning was paid out in.
alter table public.upwork_earnings add column txn_date date;
