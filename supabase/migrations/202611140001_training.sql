create table public.training_items (
  owner uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('routine','schedule','session','set','profile')),
  id text not null check (length(id) between 1 and 80),
  version integer not null check (version > 0),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 262144),
  updated_at timestamptz not null default now(),
  primary key (owner, kind, id)
);
create table public.training_operations (
  owner uuid not null references auth.users on delete cascade,
  id uuid not null,
  primary key (owner, id)
);

alter table public.training_items enable row level security;
alter table public.training_operations enable row level security;
revoke all on public.training_items, public.training_operations from public, anon, authenticated;
grant select on public.training_items to authenticated;
create policy read_own_training on public.training_items for select to authenticated
  using (owner = (select auth.uid()));

create function public.apply_change(p_operation uuid, p_kind text, p_id text, p_base integer, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_row public.training_items%rowtype;
begin
  if actor is null then raise exception 'Account required'; end if;
  if p_base is null or p_base < 0 then raise exception 'Invalid revision'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 0));
  if exists (select 1 from public.training_operations where owner = actor and id = p_operation) then
    return jsonb_build_object('status', 'applied');
  end if;
  select * into current_row from public.training_items
    where owner = actor and kind = p_kind and id = p_id;
  if coalesce(current_row.version, 0) <> p_base then
    return jsonb_build_object('status', 'conflict', 'row', to_jsonb(current_row) - 'owner');
  end if;
  insert into public.training_items(owner,kind,id,version,data)
  values (actor,p_kind,p_id,p_base + 1,p_data)
  on conflict (owner,kind,id) do update set
    version = excluded.version, data = excluded.data, updated_at = now();
  insert into public.training_operations values (actor,p_operation);
  return jsonb_build_object('status', 'applied');
end;
$$;
revoke all on function public.apply_change(uuid,text,text,integer,jsonb) from public, anon;
grant execute on function public.apply_change(uuid,text,text,integer,jsonb) to authenticated;

create function public.delete_account()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Account required'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
