-- Existing reward identity and wallet delta triggers remain authoritative.
alter table public.session_rewards drop constraint session_rewards_xp_check;
alter table public.session_rewards drop constraint session_rewards_gold_check;
alter table public.session_rewards add constraint session_rewards_xp_check check (xp in (25,30,35,40));
alter table public.session_rewards add constraint session_rewards_gold_check check (gold in (0,20,25,30,35));
alter table public.session_rewards add column improvements jsonb not null default '[]'::jsonb
  check (jsonb_typeof(improvements)='array' and jsonb_array_length(improvements)<=3);

create function public.bonus_movement(e jsonb) returns text
language sql immutable set search_path='' as $$
  select case when coalesce(e->>'measure','reps')='reps' and e->>'mode' in ('external','per-side') then
    (case when e->>'catalogId' is not null then 'catalog:'||(e->>'catalogId')
      when e#>>'{custom,id}' is not null then 'custom:'||(e#>>'{custom,id}')
      else 'name:'||lower(trim(e->>'name')) end)||':'||(e->>'mode') end;
$$;
create function public.valid_bonus_set(s jsonb) returns boolean
language sql immutable set search_path='' as $$
  select s->'done'='true'::jsonb and coalesce(s->>'type','work')<>'warmup'
    and case when jsonb_typeof(s->'reps')='number' then
      (s->>'reps')::numeric between 1 and 1000 and (s->>'reps')::numeric=trunc((s->>'reps')::numeric) else false end
    and case when jsonb_typeof(s->'kg')='number' then (s->>'kg')::numeric>=0 else false end;
$$;
create function public.session_load_improvements(p_owner uuid, session_key text) returns jsonb
language sql stable security definer set search_path='' as $$
  with current_session as (
    select data from public.training_items where owner=p_owner and kind='session' and id=session_key
      and jsonb_typeof(data->'ended')='number' and coalesce(data->'incomplete','false')<>'true'::jsonb
  ), moves as (
    select e, position, public.bonus_movement(e) as movement from current_session,
      jsonb_array_elements(data->'exercises') with ordinality as x(e,position)
  ), unique_moves as (
    select distinct on(movement) e,position,movement from moves where movement is not null order by movement,position
  ), peaks as (
    select u.*, (
      select max((s.data->>'kg')::numeric) from public.training_items s
      join moves m on m.e->>'id'=s.data->>'exerciseId' and m.movement=u.movement
      where s.owner=p_owner and s.kind='set' and s.data->>'sessionId'=session_key and public.valid_bonus_set(s.data)
        and coalesce(s.data->>'type',m.e->>'type','work')<>'warmup'
    ) as kg, (
      select max((s.data->>'kg')::numeric) from public.training_items previous
      cross join lateral jsonb_array_elements(previous.data->'exercises') as prior_moves(prior_e)
      join public.training_items s on s.owner=p_owner and s.kind='set' and s.data->>'sessionId'=previous.id and s.data->>'exerciseId'=prior_e->>'id'
      cross join current_session c
      where previous.owner=p_owner and previous.kind='session' and previous.id<>session_key
        and jsonb_typeof(previous.data->'ended')='number' and coalesce(previous.data->'incomplete','false')<>'true'::jsonb
        and (previous.data->>'started')::numeric<(c.data->>'started')::numeric
        and (previous.data->>'ended')::numeric<=(c.data->>'started')::numeric
        and public.bonus_movement(prior_e)=u.movement and public.valid_bonus_set(s.data)
        and coalesce(s.data->>'type',prior_e->>'type','work')<>'warmup'
    ) as previous_kg from unique_moves u
  ), improved as (select * from peaks where kg>previous_kg+0.000001 order by position limit 3)
  select coalesce(jsonb_agg(jsonb_build_object('exerciseId',e->>'id','name',e->>'name','previousKg',previous_kg,'kg',kg) order by position),'[]'::jsonb) from improved;
$$;

alter function public.reconcile_session_reward(uuid,text) rename to reconcile_session_base_reward;
create function public.reconcile_session_reward(p_owner uuid, session_key text)
returns void language plpgsql security definer set search_path='' as $$
declare row record; bonus_details jsonb; count_bonus integer; start_from numeric;
begin
  if coalesce(current_setting('gymbeast.restoring',true),'')='yes' then return; end if;
  if not exists(select 1 from auth.users where id=p_owner) then return; end if;
  -- Same lock as purchases / sync: two devices cannot award against an intermediate wallet.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
  select (data->>'started')::numeric into start_from from public.training_items
    where owner=p_owner and kind='session' and id=session_key;
  -- Corrections or late offline uploads can change the historical reference of later sessions.
  for row in select id from public.training_items where owner=p_owner and kind='session'
    and (start_from is null or (data->>'started')::numeric>=start_from)
    order by (data->>'ended')::numeric nulls last,id loop
    perform public.reconcile_session_base_reward(p_owner,row.id);
    bonus_details:=public.session_load_improvements(p_owner,row.id);
    count_bonus:=jsonb_array_length(bonus_details);
    update public.session_rewards r set xp=25+count_bonus*5,gold=20+count_bonus*5,improvements=bonus_details
      where r.owner=p_owner and r.session_id=row.id and r.occurrence is not null
        and (r.xp<>25+count_bonus*5 or r.gold<>20+count_bonus*5 or r.improvements is distinct from bonus_details);
  end loop;
end $$;

create or replace function public.award_training_session() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(current_setting('gymbeast.restoring',true),'')='yes' then return new; end if;
  if tg_op='UPDATE' and (
    (new.kind='session' and old.data->'started' is distinct from new.data->'started') or
    (new.kind='set' and old.data->>'sessionId' is distinct from new.data->>'sessionId')) then
    perform public.reconcile_session_reward(new.owner,'');
  elsif new.kind='session' then
    perform public.reconcile_session_reward(new.owner,new.id);
  elsif new.kind='set' then
    perform public.reconcile_session_reward(new.owner,new.data->>'sessionId');
  end if;
  return new;
end $$;

create or replace function public.reconcile_deleted_training() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(current_setting('gymbeast.restoring',true),'')='yes' then return old; end if;
  if not exists(select 1 from auth.users where id=old.owner) then return old; end if;
  if old.kind='session' then
    delete from public.session_rewards where owner=old.owner and session_id=old.id and occurrence is not null;
  end if;
  if old.kind in ('session','set') then perform public.reconcile_session_reward(old.owner,
    case when old.kind='set' then old.data->>'sessionId' else old.id end); end if;
  return old;
end $$;
revoke all on function public.bonus_movement(jsonb), public.valid_bonus_set(jsonb),
  public.session_load_improvements(uuid,text), public.reconcile_session_reward(uuid,text),
  public.reconcile_session_base_reward(uuid,text) from public,anon,authenticated;

-- Reconcile old sessions once; changes are auditable deltas, not duplicate reward rows.
do $$ declare row record; begin
  for row in select distinct owner from public.training_items where kind='session' loop
    perform public.reconcile_session_reward(row.owner,'');
  end loop;
end $$;

-- Backups preserve the breakdown and reconcile legacy snapshots after restoring the wallet.
create or replace function public.restore_account_backup(p_owner uuid,p_operation uuid,p_backup jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare payload jsonb:=p_backup->'payload'; row jsonb; revision integer; previous text; ledger_xp bigint; ledger_gold bigint;
begin
  if p_operation is null or p_backup->>'format' is distinct from 'gymbeast-account' or p_backup->>'version' is distinct from '1'
    or payload->>'owner' is distinct from p_owner::text or p_backup->>'checksum' is distinct from md5(payload::text)
    or octet_length(p_backup::text)>52428800 then raise exception 'Invalid account backup'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
  if not exists(select 1 from auth.users where id=p_owner) then raise exception 'Account not found'; end if;
  select fingerprint into previous from public.account_restores where owner=p_owner and operation=p_operation;
  if found then
    if previous<>md5(p_backup::text) then raise exception 'Restore identifier reused'; end if;
    return;
  end if;
  if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_typeof(payload->'rewards') is distinct from 'array'
    or jsonb_typeof(payload->'purchases') is distinct from 'array' or jsonb_typeof(payload->'ledger') is distinct from 'array' then
    raise exception 'Incomplete account backup';
  end if;
  perform set_config('gymbeast.restoring','yes',true);
  delete from public.training_items where owner=p_owner;
  delete from public.session_rewards where owner=p_owner;
  delete from public.pet_purchases where owner=p_owner;
  delete from public.wallet_ledger where owner=p_owner;
  insert into public.pet_purchases(owner,good,price)
    select p_owner,good,price from jsonb_to_recordset(payload->'purchases') as p(good text,price integer);
  for row in select value from jsonb_array_elements(payload->'items') order by
    case value->>'kind' when 'routine' then 0 when 'schedule' then 1 when 'session' then 2 when 'set' then 3 when 'profile' then 4 else 5 end
  loop
    revision:=greatest((row->>'version')::integer,coalesce((select version+1 from public.training_tombstones
      where owner=p_owner and kind=row->>'kind' and id=row->>'id'),1));
    insert into public.training_items(owner,kind,id,version,data) values(p_owner,row->>'kind',row->>'id',revision,row->'data');
  end loop;
  insert into public.session_rewards(owner,session_id,xp,gold,companion,occurrence,training_date,awarded_at,improvements)
    select p_owner,session_id,xp,gold,companion,occurrence,training_date,awarded_at,coalesce(improvements,'[]'::jsonb)
    from jsonb_to_recordset(payload->'rewards') as r(session_id text,xp integer,gold integer,companion text,occurrence text,training_date date,awarded_at timestamptz,improvements jsonb);
  insert into public.wallet_ledger(owner,id,source,source_id,xp,gold,created_at)
    select p_owner,id,source,source_id,xp,gold,created_at from jsonb_to_recordset(payload->'ledger') as l(
      id uuid,source text,source_id text,xp integer,gold integer,created_at timestamptz);
  select coalesce(sum(xp),0),coalesce(sum(gold),0) into ledger_xp,ledger_gold from public.wallet_ledger where owner=p_owner;
  if ledger_xp<>(select coalesce(sum(xp),0) from public.session_rewards where owner=p_owner)
    or ledger_gold<>(select coalesce(sum(gold),0) from public.session_rewards where owner=p_owner)-
      (select coalesce(sum(price),0) from public.pet_purchases where owner=p_owner) then raise exception 'Backup wallet mismatch'; end if;
  perform set_config('gymbeast.restoring','no',true);
  perform public.reconcile_session_reward(p_owner,'');
  insert into public.account_restores values(p_owner,p_operation,md5(p_backup::text));
end $$;
