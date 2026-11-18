create table public.friend_posts (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users on delete cascade,
  session_id text not null,
  created_at timestamptz not null default now(),
  unique(owner,session_id)
);
create table public.friend_cheers (
  post_id uuid references public.friend_posts on delete cascade,
  owner uuid references auth.users on delete cascade,
  primary key(post_id,owner)
);
create table public.friend_challenges (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references auth.users on delete cascade,
  recipient uuid not null references auth.users on delete cascade,
  starts_on date not null default (now() at time zone 'UTC')::date,
  ends_on date not null default ((now() at time zone 'UTC')::date + 6),
  accepted boolean not null default false,
  check(sender <> recipient),
  unique(sender,recipient,starts_on)
);
alter table public.friend_posts enable row level security;
alter table public.friend_cheers enable row level security;
alter table public.friend_challenges enable row level security;
revoke all on public.friend_posts, public.friend_cheers, public.friend_challenges from public, anon, authenticated;

create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.social_relationships where status='accepted' and (
    (sender=a and recipient=b) or (sender=b and recipient=a)
  ));
$$;
revoke all on function public.are_friends(uuid,uuid) from public, anon, authenticated;

create function public.friend_activity(p_action text default 'list', p_value text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  other uuid;
  target_post uuid;
  today date := (now() at time zone 'UTC')::date;
begin
  if actor is null then raise exception 'Account required'; end if;
  if p_action = 'publish' then
    if not exists(select 1 from public.social_profiles where owner=actor) then raise exception 'Elegí tu usuario primero'; end if;
    if not exists(select 1 from public.session_rewards where owner=actor and session_id=p_value and occurrence is not null) then
      raise exception 'La sesión todavía no está confirmada';
    end if;
    insert into public.friend_posts(owner,session_id) values(actor,p_value) on conflict do nothing;
  elsif p_action = 'unpublish' then
    delete from public.friend_posts where owner=actor and id=p_value::uuid;
  elsif p_action in ('cheer','uncheer') then
    select id into target_post from public.friend_posts where id=p_value::uuid and public.are_friends(actor,owner);
    if target_post is null then raise exception 'Publicación no disponible'; end if;
    if p_action='cheer' then
      insert into public.friend_cheers values(target_post,actor) on conflict do nothing;
    else
      delete from public.friend_cheers where friend_cheers.post_id=target_post and owner=actor;
    end if;
  elsif p_action='challenge' then
    select owner into other from public.social_profiles where handle=lower(trim(p_value));
    if not public.are_friends(actor,other) then raise exception 'Elegí un amigo disponible'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      least(actor,other)::text || greatest(actor,other)::text, 1));
    if not exists(select 1 from public.friend_challenges c where c.ends_on >= today
      and ((c.sender=actor and c.recipient=other) or (c.sender=other and c.recipient=actor))) then
      insert into public.friend_challenges(sender,recipient) values(actor,other);
    end if;
  elsif p_action='accept' then
    update public.friend_challenges set accepted=true, starts_on=today, ends_on=today+6
      where id=p_value::uuid and recipient=actor and ends_on >= today and not accepted and public.are_friends(actor,sender);
  elsif p_action='decline' then
    delete from public.friend_challenges where id=p_value::uuid and recipient=actor and not accepted;
  elsif p_action <> 'list' then raise exception 'Invalid action';
  end if;

  return jsonb_build_object('posts',coalesce((
    select jsonb_agg(to_jsonb(entry) order by entry.created_at desc) from (
      select p.id, p.created_at, s.handle, p.owner=actor as mine,
        exists(select 1 from public.friend_cheers r where r.post_id=p.id and r.owner=actor) as cheered,
        (select count(*) from public.friend_cheers r where r.post_id=p.id and public.are_friends(r.owner,p.owner)) as cheers
      from public.friend_posts p join public.social_profiles s on s.owner=p.owner
      join public.session_rewards reward on reward.owner=p.owner and reward.session_id=p.session_id and reward.occurrence is not null
      where p.owner=actor or public.are_friends(actor,p.owner)
      order by p.created_at desc limit 30
    ) entry
  ),'[]'::jsonb),'challenges',coalesce((
    select jsonb_agg(to_jsonb(entry) order by entry.ends_on desc) from (
      select c.id, c.accepted, c.starts_on, c.ends_on, c.sender=actor as outgoing, c.ends_on < today as expired,
        s.handle,
        case when c.accepted then (select count(distinct training_date) from public.session_rewards r where r.owner=actor
          and r.occurrence is not null and r.training_date between c.starts_on and c.ends_on) else 0 end as mine,
        case when c.accepted then (select count(distinct training_date) from public.session_rewards r where r.owner=s.owner
          and r.occurrence is not null and r.training_date between c.starts_on and c.ends_on) else 0 end as theirs
      from public.friend_challenges c join public.social_profiles s on s.owner=case when c.sender=actor then c.recipient else c.sender end
      where (c.sender=actor or c.recipient=actor) and public.are_friends(c.sender,c.recipient)
      order by c.ends_on desc limit 20
    ) entry
  ),'[]'::jsonb));
end;
$$;
revoke all on function public.friend_activity(text,text) from public, anon;
grant execute on function public.friend_activity(text,text) to authenticated;
