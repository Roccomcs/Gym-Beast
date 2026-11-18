create table public.social_profiles (
  owner uuid primary key references auth.users on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,24}$'),
  avatar text check (avatar is null or (length(avatar) <= 90000 and avatar ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'))
);
create table public.social_relationships (
  sender uuid references auth.users on delete cascade,
  recipient uuid references auth.users on delete cascade,
  status text not null check (status in ('pending','accepted','blocked')),
  primary key (sender, recipient),
  check(sender <> recipient)
);
alter table public.social_profiles enable row level security;
alter table public.social_relationships enable row level security;
revoke all on public.social_profiles, public.social_relationships from public, anon, authenticated;

create function public.social_action(p_action text, p_handle text default null, p_avatar text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  other uuid;
  normalized text := lower(trim(p_handle));
begin
  if actor is null then raise exception 'Account required'; end if;
  if p_action = 'handle' then
    insert into public.social_profiles(owner,handle) values(actor, normalized)
      on conflict(owner) do update set handle=excluded.handle;
  elsif p_action = 'avatar' then
    update public.social_profiles set avatar=p_avatar where owner=actor;
  elsif p_action <> 'list' then
    select owner into other from public.social_profiles where handle=normalized;
    if other is null or other = actor then raise exception 'Usuario no encontrado'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      least(actor,other)::text || greatest(actor,other)::text, 1));
    if p_action = 'block' then
      delete from public.social_relationships where
        (sender=actor and recipient=other) or (sender=other and recipient=actor and status <> 'blocked');
      insert into public.social_relationships values(actor,other,'blocked');
    elsif p_action = 'unblock' then
      delete from public.social_relationships where sender=actor and recipient=other and status='blocked';
    elsif exists(select 1 from public.social_relationships where status='blocked' and
        ((sender=actor and recipient=other) or (sender=other and recipient=actor))) then
      raise exception 'Usuario no disponible';
    elsif p_action = 'request' then
      if not exists(select 1 from public.social_profiles where owner=actor) then raise exception 'Elegí tu usuario primero'; end if;
      if not exists(select 1 from public.social_relationships where sender=other and recipient=actor) then
        insert into public.social_relationships values(actor,other,'pending') on conflict do nothing;
      end if;
    elsif p_action = 'accept' then
      update public.social_relationships set status='accepted'
        where sender=other and recipient=actor and status='pending';
    elsif p_action = 'remove' then
      delete from public.social_relationships where status <> 'blocked' and
        ((sender=actor and recipient=other) or (sender=other and recipient=actor));
    else raise exception 'Invalid action';
    end if;
  end if;
  return jsonb_build_object(
    'handle', (select handle from public.social_profiles where owner=actor),
    'avatar', (select avatar from public.social_profiles where owner=actor),
    'relationships', coalesce((select jsonb_agg(jsonb_build_object(
      'handle', profile.handle, 'status', relation.status, 'outgoing', relation.sender=actor
    ) || case when relation.status='accepted' then jsonb_build_object('avatar',profile.avatar) else '{}'::jsonb end
    order by profile.handle) from public.social_relationships relation
    join public.social_profiles profile on profile.owner=case when relation.sender=actor then relation.recipient else relation.sender end
    where relation.sender=actor or (relation.recipient=actor and relation.status <> 'blocked')), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.social_action(text,text,text) from public, anon;
grant execute on function public.social_action(text,text,text) to authenticated;
