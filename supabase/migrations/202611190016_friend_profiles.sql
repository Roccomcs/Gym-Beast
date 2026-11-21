-- All social reads recheck both acceptance and blocking, including older RPCs.
create or replace function public.are_friends(a uuid,b uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.social_relationships where status='accepted' and
    ((sender=a and recipient=b) or (sender=b and recipient=a)))
    and not exists(select 1 from public.social_relationships where status='blocked' and
    ((sender=a and recipient=b) or (sender=b and recipient=a)));
$$;

create function public.shared_routine_snapshot(r jsonb) returns jsonb
language sql immutable set search_path='' as $$
  select jsonb_build_object('name',r->>'name','version',r->'version','source','',
    'cover',coalesce(r->'cover','0'::jsonb),'photo',case when length(r->>'photo')<=90000 and r->>'photo' ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' then r->'photo' end,
    'rotateAB',coalesce(r->'rotateAB','false'::jsonb),
    'days',coalesce((select jsonb_agg(jsonb_build_object('id',d->>'id','title',d->>'title',
      'exercises',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id',e->>'id','name',e->>'name','catalogId',e->'catalogId','original',e->>'name',
        'sets',e->'sets','min',e->'min','max',e->'max','rest',e->'rest','type',e->'type','mode',e->'mode',
        'measure',e->'measure','custom',case when e ? 'custom' then jsonb_build_object('id',e#>>'{custom,id}','primary',e#>>'{custom,primary}',
          'secondary',e#>'{custom,secondary}','equipment',e#>>'{custom,equipment}') end,
        'superset',case when e ? 'superset' then jsonb_build_object('id',e#>>'{superset,id}','name',e#>>'{superset,name}','rounds',e#>'{superset,rounds}') end)) || jsonb_build_object(
        'load',null,'unit',null,'catalogId',e->'catalogId','sets',e->'sets','min',e->'min','max',e->'max','rest',e->'rest'))
        from jsonb_array_elements(d->'exercises') as moves(e)),'[]'::jsonb)))
      from jsonb_array_elements(r->'days') as days(d)),'[]'::jsonb));
$$;

create function public.social_snapshot(p_owner uuid,p_since date,p_until date) returns jsonb
language sql stable security definer set search_path='' as $$
  with raw_profile as (select coalesce((select data from public.training_items where owner=p_owner and kind='profile' and id='self'),'{}'::jsonb) as data),
  profile as (select data,(statement_timestamp() at time zone coalesce(data->>'timezone','UTC'))::date as today from raw_profile),
  earned as (select s.id,s.data,r.xp,r.companion,r.training_date from public.training_items s
    join public.session_rewards r on r.owner=s.owner and r.session_id=s.id and r.occurrence is not null
    where s.owner=p_owner and s.kind='session' and s.data->'incomplete' is distinct from 'true'::jsonb and r.training_date<=(select today from profile)),
  peaks as (
    select coalesce(e->>'catalogId',e#>>'{custom,id}') as movement,e->>'mode' as mode,
      min(e->>'name') as name,max((s.data->>'kg')::numeric) as kg,
      max((s.data->>'kg')::numeric) filter(where x.training_date between p_since and p_until) as period_kg
    from earned x cross join lateral jsonb_array_elements(x.data->'exercises') as moves(e)
    join public.training_items s on s.owner=p_owner and s.kind='set' and s.data->>'sessionId'=x.id and s.data->>'exerciseId'=e->>'id'
    where coalesce(e->>'measure','reps')='reps' and e->>'mode' in ('external','per-side')
      and coalesce(s.data->>'type',e->>'type','work')<>'warmup' and public.valid_bonus_set(s.data)
      and coalesce(e->>'catalogId',e#>>'{custom,id}') is not null
    group by coalesce(e->>'catalogId',e#>>'{custom,id}'),e->>'mode'
  ) select jsonb_build_object(
    'handle',(select handle from public.social_profiles where owner=p_owner),
    'avatar',(select avatar from public.social_profiles where owner=p_owner),
    'name',left(coalesce(data->>'name','Atleta'),60),'companion',coalesce(data->>'companion','Dragón'),
    'unit',coalesce(data->>'unit','kg'),'timezone',coalesce(data->>'timezone','UTC'),'today',today,
    'accountXp',(select coalesce(sum(xp),0) from public.session_rewards where owner=p_owner),
    'periodSessions',(select count(*) from earned where training_date between p_since and p_until),
    'periodDays',(select count(distinct training_date) from earned where training_date between p_since and p_until),
    'periodXp',(select coalesce(sum(xp),0) from earned where training_date between p_since and p_until),
    'records',coalesce((select jsonb_agg(to_jsonb(peaks) order by name,mode) from peaks),'[]'::jsonb),
    'outfit',coalesce((select jsonb_agg(value) from jsonb_each_text(coalesce(data#>array['petOutfits',data->>'companion'],'{}'::jsonb))
      where value is not null and exists(select 1 from public.pet_purchases p where p.owner=p_owner and p.good=value)),'[]'::jsonb),
    'plans',coalesce((select jsonb_agg(jsonb_build_object('from',plan->>'from','target',plan->'target','companion',plan->>'companion'))
      from jsonb_array_elements(coalesce(data->'petPlans',case when data#>>'{cycle,startedOn}' is not null then jsonb_build_array(jsonb_build_object(
      'from',data#>>'{cycle,startedOn}','companion',coalesce(data->>'companion','Dragón'),
      'target',least(7,coalesce((select jsonb_array_length(r.data->'days') from public.training_items r where r.owner=p_owner and r.kind='routine' and r.id=data#>>'{cycle,routineId}'),0)))) else '[]'::jsonb end)) as plans(plan)
      where plan->>'from'<=today::text),'[]'::jsonb),
    'sessions',coalesce((select jsonb_agg(jsonb_build_object('id',md5(id),'data',jsonb_build_object(
      'title','','date',training_date,'started',extract(epoch from training_date::timestamp at time zone 'UTC')*1000,
      'ended',extract(epoch from training_date::timestamp at time zone 'UTC')*1000+60000,'exercises','[]'::jsonb,
      'scheduleId',case when data->>'scheduleId' is not null then md5(data->>'scheduleId') end,'companion',companion)) order by training_date,id) from earned),'[]'::jsonb),
    'rewards',coalesce((select jsonb_agg(jsonb_build_object('session_id',md5(id),'xp',xp,'companion',companion)) from earned),'[]'::jsonb),
    'schedules',coalesce((select jsonb_agg(jsonb_build_object('id',md5(id),'data',jsonb_build_object(
      'date',data->>'date','skipped',coalesce(data->'skipped','false'::jsonb),'title','','exercises','[]'::jsonb,'routineId','','version',1)))
      from public.training_items where owner=p_owner and kind='schedule'
        and (data->>'date')::date<=date_trunc('week',today)::date+6),'[]'::jsonb),
    'routines',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'data',public.shared_routine_snapshot(r.data)) order by r.data->>'name')
      from public.training_items r where r.owner=p_owner and r.kind='routine' and r.data->'archived' is distinct from 'true'::jsonb
      and coalesce(profile.data->'sharedRoutineIds','[]'::jsonb) ? r.id),'[]'::jsonb)
  ) from profile;
$$;

create function public.friend_profile(p_handle text,p_days integer default 28) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); other uuid; until_date date; since_date date; zone text;
begin
  perform public.require_account_ready();
  if p_days not in (7,28,90) or p_days is null then raise exception 'Período inválido'; end if;
  select owner into other from public.social_profiles where handle=lower(trim(p_handle));
  if other is null or not public.are_friends(actor,other) then raise exception 'Perfil no disponible'; end if;
  select data->>'timezone' into zone from public.training_items where owner=actor and kind='profile' and id='self';
  until_date:=(statement_timestamp() at time zone coalesce(zone,'UTC'))::date;
  since_date:=until_date-(p_days-1);
  return jsonb_build_object('since',since_date,'until',until_date,'days',p_days,
    'mine',public.social_snapshot(actor,since_date,until_date),'friend',public.social_snapshot(other,since_date,until_date));
end $$;
revoke all on function public.shared_routine_snapshot(jsonb),public.social_snapshot(uuid,date,date),public.friend_profile(text,integer) from public,anon,authenticated;
grant execute on function public.friend_profile(text,integer) to authenticated;

create function public.validate_shared_routine_ids() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.kind='profile' and new.data ? 'sharedRoutineIds' then
    if jsonb_typeof(new.data->'sharedRoutineIds') is distinct from 'array' then raise exception 'Rutinas compartidas inválidas'; end if;
    if jsonb_array_length(new.data->'sharedRoutineIds')>50 or exists(select 1 from jsonb_array_elements(new.data->'sharedRoutineIds') e
      where jsonb_typeof(e)<>'string' or length(e#>>'{}') not between 1 and 80) then raise exception 'Rutinas compartidas inválidas'; end if;
  end if;
  return new;
end $$;
revoke all on function public.validate_shared_routine_ids() from public,anon,authenticated;
create trigger validate_shared_routine_ids before insert or update on public.training_items for each row execute function public.validate_shared_routine_ids();

alter table public.friend_challenges add column timezone text not null default 'UTC';
create function public.challenge_day_count(p_owner uuid,p_start date,p_end date,p_zone text) returns bigint
language sql stable security definer set search_path='' as $$
  select count(distinct day) from (
    select case when jsonb_typeof(s.data->'started')='number' then
      (to_timestamp((s.data->>'started')::numeric/1000) at time zone p_zone)::date else r.training_date end as day
    from public.session_rewards r join public.training_items s on s.owner=r.owner and s.kind='session' and s.id=r.session_id
    where r.owner=p_owner and r.occurrence is not null
  ) dates where day between p_start and least(p_end,(statement_timestamp() at time zone p_zone)::date);
$$;
revoke all on function public.challenge_day_count(uuid,date,date,text) from public,anon,authenticated;

-- Feed fields stay minimal: avatar and earned session EXP, never weights or notes.
create or replace function public.friend_activity(p_action text default 'list', p_value text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  other uuid;
  target_post uuid;
  zone text:=coalesce((select data->>'timezone' from public.training_items where owner=actor and kind='profile' and id='self'),'UTC');
  today date := (statement_timestamp() at time zone zone)::date;
begin
  perform public.require_account_ready();
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
    if not exists(select 1 from public.friend_challenges c where c.ends_on >= (statement_timestamp() at time zone c.timezone)::date
      and ((c.sender=actor and c.recipient=other) or (c.sender=other and c.recipient=actor))) then
      insert into public.friend_challenges(sender,recipient,timezone,starts_on,ends_on) values(actor,other,zone,today,today+6);
    end if;
  elsif p_action='accept' then
    update public.friend_challenges set accepted=true, starts_on=(statement_timestamp() at time zone timezone)::date,
      ends_on=(statement_timestamp() at time zone timezone)::date+6
      where id=p_value::uuid and recipient=actor and ends_on >= (statement_timestamp() at time zone timezone)::date
        and not accepted and public.are_friends(actor,sender);
  elsif p_action='decline' then
    delete from public.friend_challenges where id=p_value::uuid and recipient=actor and not accepted;
  elsif p_action <> 'list' then raise exception 'Invalid action';
  end if;

  return jsonb_build_object('posts',coalesce((
    select jsonb_agg(to_jsonb(entry) order by entry.created_at desc) from (
      select p.id, p.created_at, s.handle, s.avatar, reward.xp, p.owner=actor as mine,
        exists(select 1 from public.friend_cheers r where r.post_id=p.id and r.owner=actor) as cheered,
        (select count(*) from public.friend_cheers r where r.post_id=p.id and public.are_friends(r.owner,p.owner)) as cheers
      from public.friend_posts p join public.social_profiles s on s.owner=p.owner
      join public.session_rewards reward on reward.owner=p.owner and reward.session_id=p.session_id and reward.occurrence is not null
      where p.owner=actor or public.are_friends(actor,p.owner)
      order by p.created_at desc limit 30
    ) entry
  ),'[]'::jsonb),'challenges',coalesce((
    select jsonb_agg(to_jsonb(entry) order by entry.ends_on desc) from (
      select c.id, c.accepted, c.starts_on, c.ends_on, c.timezone, c.sender=actor as outgoing,
        c.ends_on < (statement_timestamp() at time zone c.timezone)::date as expired,
        s.handle,
        case when c.accepted then public.challenge_day_count(actor,c.starts_on,c.ends_on,c.timezone) else 0 end as mine,
        case when c.accepted then public.challenge_day_count(s.owner,c.starts_on,c.ends_on,c.timezone) else 0 end as theirs
      from public.friend_challenges c join public.social_profiles s on s.owner=case when c.sender=actor then c.recipient else c.sender end
      where (c.sender=actor or c.recipient=actor) and public.are_friends(c.sender,c.recipient)
      order by c.ends_on desc limit 20
    ) entry
  ),'[]'::jsonb));
end;
$$;
