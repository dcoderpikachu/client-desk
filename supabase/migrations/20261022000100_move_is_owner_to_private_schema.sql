-- Keep the owner check out of the public API (it was callable via /rest/v1/rpc/is_owner).
-- Policies reference the function by id, so they follow it to the new schema.
create schema if not exists private;
alter function public.is_owner() set schema private;
revoke all on function private.is_owner() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_owner() to authenticated;
