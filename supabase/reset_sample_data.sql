-- Removes ALL client, billing and relationship data (sample or real).
-- Keeps exchange rates, settings and the owner allow-list.
-- Run in the Supabase SQL editor before importing your real data.

begin;
delete from public.action_items;
delete from public.touchpoints;
delete from public.notes;
delete from public.health_ratings;
delete from public.invoices;
delete from public.upwork_earnings;
delete from public.upwork_charges;
delete from public.payouts;
delete from public.engagements;
delete from public.contacts;
delete from public.brands;
delete from public.clients;
commit;
