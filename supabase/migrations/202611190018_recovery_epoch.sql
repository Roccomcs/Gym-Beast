-- Rotate only after a whole-project restore, never for normal deploys.
create table public.pilot_sync_epoch (
  singleton boolean primary key default true check(singleton),
  epoch uuid not null default gen_random_uuid()
);
insert into public.pilot_sync_epoch default values;
alter table public.pilot_sync_epoch enable row level security;
revoke all on public.pilot_sync_epoch from public,anon,authenticated;
create function public.begin_recovery_epoch() returns uuid language plpgsql security definer set search_path='' as $$
declare next_epoch uuid;
begin
  update public.pilot_sync_epoch set epoch=gen_random_uuid() returning epoch into next_epoch;
  return next_epoch;
end $$;
revoke all on function public.begin_recovery_epoch() from public,anon,authenticated;
grant execute on function public.begin_recovery_epoch() to service_role;

alter function public.sync_pull(bigint,integer) rename to sync_pull_state;
revoke all on function public.sync_pull_state(bigint,integer) from public,anon,authenticated;
create function public.sync_pull(p_cursor bigint default 0,p_limit integer default 250) returns jsonb
language sql stable security definer set search_path='' as $$
  select public.sync_pull_state(p_cursor,p_limit)||jsonb_build_object('epoch',(select epoch from public.pilot_sync_epoch));
$$;
revoke all on function public.sync_pull(bigint,integer) from public,anon;
grant execute on function public.sync_pull(bigint,integer) to authenticated;
