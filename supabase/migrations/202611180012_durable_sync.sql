create table public.sync_heads (
  owner uuid primary key references auth.users on delete cascade,
  revision bigint not null default 0
);
create table public.sync_changes (
  owner uuid not null references auth.users on delete cascade,
  revision bigint not null,
  kind text not null,
  id text not null,
  version integer not null,
  data jsonb,
  deleted boolean not null,
  primary key(owner, revision)
);
create table public.training_tombstones (
  owner uuid not null references auth.users on delete cascade,
  kind text not null,
  id text not null,
  version integer not null,
  primary key(owner,kind,id)
);
create table public.wallet_ledger (
  owner uuid not null references auth.users on delete cascade,
  id uuid not null default gen_random_uuid(),
  source text not null check(source in ('reward','purchase','opening')),
  source_id text not null,
  xp integer not null,
  gold integer not null,
  created_at timestamptz not null default now(),
  primary key(owner,id)
);
create table public.account_restores (
  owner uuid not null references auth.users on delete cascade,
  operation uuid not null,
  fingerprint text not null,
  primary key(owner,operation)
);
alter table public.training_operations add column request_hash bytea, add column result jsonb;

do $$ declare name text; begin
  foreach name in array array['sync_heads','sync_changes','training_tombstones','wallet_ledger','account_restores'] loop
    execute format('alter table public.%I enable row level security',name);
    execute format('revoke all on public.%I from public, anon, authenticated',name);
  end loop;
end $$;
grant select on public.wallet_ledger to authenticated;
create policy own_wallet_ledger on public.wallet_ledger for select to authenticated
  using(owner=(select auth.uid()) and (select public.account_ready()));

create function public.append_sync_change(p_owner uuid, p_kind text, p_id text, p_version integer, p_data jsonb, p_deleted boolean)
returns void language plpgsql security definer set search_path='' as $$
declare next_revision bigint;
begin
  -- Owner-local counter locks serialize commits, including transactions that roll back.
  if not exists(select 1 from auth.users where id=p_owner) then return; end if;
  insert into public.sync_heads(owner,revision) values(p_owner,1)
    on conflict(owner) do update set revision=sync_heads.revision+1 returning revision into next_revision;
  insert into public.sync_changes values(p_owner,next_revision,p_kind,p_id,p_version,p_data,p_deleted);
end $$;
revoke all on function public.append_sync_change(uuid,text,text,integer,jsonb,boolean) from public,anon,authenticated;

create function public.log_training_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then
    if not exists(select 1 from auth.users where id=old.owner) then return old; end if;
    insert into public.training_tombstones values(old.owner,old.kind,old.id,old.version+1)
      on conflict(owner,kind,id) do update set version=greatest(training_tombstones.version,excluded.version);
    perform public.append_sync_change(old.owner,old.kind,old.id,old.version+1,null,true);
    return old;
  end if;
  delete from public.training_tombstones where owner=new.owner and kind=new.kind and id=new.id;
  perform public.append_sync_change(new.owner,new.kind,new.id,new.version,new.data,false);
  return new;
end $$;
revoke all on function public.log_training_change() from public,anon,authenticated;
create trigger log_training_change after insert or update or delete on public.training_items
  for each row execute function public.log_training_change();

create function public.log_reward_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  actor uuid;
  source_id text;
  xp_delta integer;
  gold_delta integer;
begin
  if tg_op='DELETE' then actor:=old.owner; source_id:=old.session_id;
    xp_delta:=-old.xp; gold_delta:=-old.gold;
    perform public.append_sync_change(actor,'reward',source_id,0,null,true);
  else actor:=new.owner; source_id:=new.session_id;
    xp_delta:=new.xp; gold_delta:=new.gold;
    if tg_op='UPDATE' then xp_delta:=xp_delta-old.xp; gold_delta:=gold_delta-old.gold; end if;
    perform public.append_sync_change(actor,'reward',source_id,0,to_jsonb(new),false);
  end if;
  if coalesce(current_setting('gymbeast.restoring',true),'') <> 'yes'
    and exists(select 1 from auth.users where id=actor) and (xp_delta<>0 or gold_delta<>0) then
    insert into public.wallet_ledger(owner,source,source_id,xp,gold) values(actor,'reward',source_id,xp_delta,gold_delta);
  end if;
  if tg_op='DELETE' and old.occurrence is not null and exists(select 1 from auth.users where id=actor)
    and coalesce(current_setting('gymbeast.restoring',true),'') <> 'yes' then
    delete from public.session_rewards where owner=actor and session_id in (
      select 'mission:'||goal::text from (values(1),(5),(10)) as milestone(goal)
      where goal>(select count(*) from public.session_rewards where owner=actor and occurrence is not null));
  end if;
  return null;
end $$;
revoke all on function public.log_reward_change() from public,anon,authenticated;
create trigger log_reward_change after insert or update or delete on public.session_rewards
  for each row execute function public.log_reward_change();

create function public.log_purchase_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid; good_id text; delta integer;
begin
  if tg_op='DELETE' then actor:=old.owner; good_id:=old.good; delta:=old.price;
  else actor:=new.owner; good_id:=new.good; delta:=-new.price;
    if tg_op='UPDATE' then delta:=old.price-new.price; end if;
  end if;
  if coalesce(current_setting('gymbeast.restoring',true),'') <> 'yes'
    and exists(select 1 from auth.users where id=actor) and delta<>0 then
    insert into public.wallet_ledger(owner,source,source_id,xp,gold) values(actor,'purchase',good_id,0,delta);
  end if;
  return null;
end $$;
revoke all on function public.log_purchase_change() from public,anon,authenticated;
create trigger log_purchase_change after insert or update or delete on public.pet_purchases
  for each row execute function public.log_purchase_change();

-- Existing confirmed balances become the auditable starting point.
insert into public.wallet_ledger(owner,source,source_id,xp,gold)
  select owner,'opening',session_id,xp,gold from public.session_rewards;
insert into public.wallet_ledger(owner,source,source_id,xp,gold)
  select owner,'purchase',good,0,-price from public.pet_purchases;
do $$ declare row record; begin
  for row in select * from public.training_items order by owner,kind,id loop
    perform public.append_sync_change(row.owner,row.kind,row.id,row.version,row.data,false);
  end loop;
  for row in select * from public.session_rewards order by owner,session_id loop
    perform public.append_sync_change(row.owner,'reward',row.session_id,0,to_jsonb(row),false);
  end loop;
end $$;

-- Generated references retain the JSON snapshots while enforcing ownership in SQL.
alter table public.training_items
  add column parent_kind text generated always as (case when kind='set' then 'session' end) stored,
  add column parent_id text generated always as (case when kind='set' then data->>'sessionId' end) stored;
alter table public.training_items add constraint owned_session_parent
  foreign key(owner,parent_kind,parent_id) references public.training_items(owner,kind,id) on delete cascade not valid;

create function public.validate_training_relations() returns trigger
language plpgsql security definer set search_path='' as $$
declare parent jsonb; exercise jsonb; reference text;
begin
  if new.kind='profile' and new.id<>'self' then raise exception 'Invalid profile identifier'; end if;
  reference:=case when new.kind='profile' then new.data#>>'{cycle,routineId}' else new.data->>'routineId' end;
  if reference is not null and not exists(select 1 from public.training_items where owner=new.owner and kind='routine' and id=reference)
    and not exists(select 1 from public.training_tombstones where owner=new.owner and kind='routine' and id=reference) then
    raise exception 'La rutina no pertenece a esta cuenta';
  end if;
  if new.kind='session' and new.data ? 'scheduleId' and not exists(select 1 from public.training_items
    where owner=new.owner and kind='schedule' and id=new.data->>'scheduleId')
    and not exists(select 1 from public.training_tombstones where owner=new.owner and kind='schedule' and id=new.data->>'scheduleId') then
    raise exception 'La planificación no pertenece a esta cuenta';
  end if;
  if new.kind='set' then
    select data into parent from public.training_items where owner=new.owner and kind='session' and id=new.data->>'sessionId';
    if parent is null or not exists(select 1 from jsonb_array_elements(parent->'exercises') e where e->>'id'=new.data->>'exerciseId') then
      raise exception 'La serie no pertenece a un ejercicio de esta sesión';
    end if;
    if new.data ? 'kg' and new.data->'kg'<>'null'::jsonb and
      (jsonb_typeof(new.data->'kg')<>'number' or (new.data->>'kg')::numeric<0) then raise exception 'Invalid weight'; end if;
    if (new.data->>'reps')::numeric<>trunc((new.data->>'reps')::numeric) then raise exception 'Invalid repetitions'; end if;
  elsif new.kind in ('session','schedule') then
    if new.data ? 'date' then perform (new.data->>'date')::date; end if;
    if exists(select 1 from jsonb_array_elements(new.data->'exercises') e
      where jsonb_typeof(e->'id') is distinct from 'string' or length(e->>'id') not between 1 and 80)
      or exists(select 1 from jsonb_array_elements(new.data->'exercises') e group by e->>'id' having count(*)>1) then
      raise exception 'Invalid exercise identifiers';
    end if;
    if new.kind='session' and exists(select 1 from public.training_items s where s.owner=new.owner and s.kind='set'
      and s.data->>'sessionId'=new.id and not exists(select 1 from jsonb_array_elements(new.data->'exercises') e where e->>'id'=s.data->>'exerciseId')) then
      raise exception 'Quitá las series antes de quitar su ejercicio';
    end if;
  elsif new.kind='routine' then
    for parent in select value from jsonb_array_elements(new.data->'days') loop
      if jsonb_typeof(parent->'exercises') is distinct from 'array' or jsonb_typeof(parent->'id') is distinct from 'string' then
        raise exception 'Invalid routine day';
      end if;
      for exercise in select value from jsonb_array_elements(parent->'exercises') loop
        if jsonb_typeof(exercise->'id') is distinct from 'string' or jsonb_typeof(exercise->'name') is distinct from 'string' then
          raise exception 'Invalid routine exercise';
        end if;
      end loop;
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.validate_training_relations() from public,anon,authenticated;
create trigger validate_training_relations before insert or update on public.training_items
  for each row execute function public.validate_training_relations();

create function public.reconcile_deleted_training() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(current_setting('gymbeast.restoring',true),'')='yes' then return old; end if;
  if not exists(select 1 from auth.users where id=old.owner) then return old; end if;
  if old.kind='session' then
    delete from public.session_rewards where owner=old.owner and session_id=old.id and occurrence is not null;
  elsif old.kind='set' then
    perform public.reconcile_session_reward(old.owner,old.data->>'sessionId');
  end if;
  return old;
end $$;
revoke all on function public.reconcile_deleted_training() from public,anon,authenticated;
create trigger reconcile_deleted_training after delete on public.training_items
  for each row execute function public.reconcile_deleted_training();

create function public.apply_training_operation(p_operation uuid,p_kind text,p_id text,p_base integer,p_data jsonb,p_delete boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_row public.training_items%rowtype; current_version integer;
  saved public.training_operations%rowtype; result jsonb; request jsonb;
begin
  perform public.require_account_ready();
  if p_kind not in ('profile','routine','schedule','session','set') or p_id is null or length(p_id) not between 1 and 80
    or p_base is null or p_base<0 or p_operation is null or p_delete is null then raise exception 'Invalid operation'; end if;
  if p_delete and p_kind='profile' then raise exception 'Usá la eliminación de cuenta para borrar el perfil'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  request:=jsonb_build_object('kind',p_kind,'id',p_id,'base',p_base,'data',p_data,'delete',p_delete);
  select * into saved from public.training_operations where owner=actor and id=p_operation;
  if found then
    if saved.request_hash is not null and saved.request_hash<>sha256(convert_to(request::text,'UTF8')) then raise exception 'Operation identifier reused'; end if;
    return coalesce(saved.result,jsonb_build_object('status','applied'));
  end if;
  select * into current_row from public.training_items where owner=actor and kind=p_kind and id=p_id;
  current_version:=coalesce(current_row.version,(select version from public.training_tombstones where owner=actor and kind=p_kind and id=p_id),0);
  if current_version<>p_base then
    return jsonb_build_object('status','conflict','row',jsonb_build_object('kind',p_kind,'id',p_id,'version',current_version,
      'data',current_row.data,'deleted',current_row.id is null));
  end if;
  if p_delete then
    if current_row.id is null then raise exception 'Registro ya eliminado'; end if;
    delete from public.training_items where owner=actor and kind=p_kind and id=p_id;
  else
    insert into public.training_items(owner,kind,id,version,data) values(actor,p_kind,p_id,p_base+1,p_data)
      on conflict(owner,kind,id) do update set version=excluded.version,data=excluded.data,updated_at=now();
  end if;
  result:=jsonb_build_object('status','applied','version',p_base+1);
  insert into public.training_operations(owner,id,request_hash,result) values(actor,p_operation,sha256(convert_to(request::text,'UTF8')),result);
  return result;
end $$;
revoke all on function public.apply_training_operation(uuid,text,text,integer,jsonb,boolean) from public,anon,authenticated;

create or replace function public.apply_change(p_operation uuid,p_kind text,p_id text,p_base integer,p_data jsonb)
returns jsonb language sql security definer set search_path='' as $$
  select public.apply_training_operation(p_operation,p_kind,p_id,p_base,p_data,false);
$$;

create function public.sync_push(p_operations jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare operation jsonb; result jsonb; results jsonb:='[]'; blocked text[]:='{}'; entity text;
begin
  perform public.require_account_ready();
  if jsonb_typeof(p_operations) is distinct from 'array' or jsonb_array_length(p_operations)>50
    or octet_length(p_operations::text)>2097152 then raise exception 'Invalid batch'; end if;
  for operation in select value from jsonb_array_elements(p_operations) loop
    entity:=(operation->>'kind')||':'||(operation->>'id');
    if entity=any(blocked) then
      results:=results||jsonb_build_array(jsonb_build_object('op',operation->>'op','status','blocked')); continue;
    end if;
    begin
      if coalesce(operation->>'action','put') not in ('put','delete') then raise exception 'Invalid action'; end if;
      result:=public.apply_training_operation((operation->>'op')::uuid,operation->>'kind',operation->>'id',
        (operation->>'base')::integer,operation->'data',coalesce(operation->>'action','put')='delete');
    exception when sqlstate 'P0001' or integrity_constraint_violation or data_exception then
      result:=jsonb_build_object('status','rejected','error',sqlerrm);
    end;
    if result->>'status' in ('conflict','rejected') then blocked:=array_append(blocked,entity); end if;
    results:=results||jsonb_build_array(result||jsonb_build_object('op',operation->>'op'));
  end loop;
  return results;
end $$;
revoke all on function public.sync_push(jsonb) from public,anon;
grant execute on function public.sync_push(jsonb) to authenticated;

create function public.sync_pull(p_cursor bigint default 0,p_limit integer default 250) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); changes jsonb; next_cursor bigint;
begin
  perform public.require_account_ready();
  if p_cursor is null or p_limit is null or p_cursor<0 or p_limit not between 1 and 250 then raise exception 'Invalid cursor'; end if;
  select coalesce(jsonb_agg(to_jsonb(page) order by revision),'[]'),coalesce(max(revision),p_cursor) into changes,next_cursor
    from (select revision,kind,id,version,data,deleted from public.sync_changes
      where owner=actor and revision>p_cursor order by revision limit p_limit) page;
  return jsonb_build_object('changes',changes,'cursor',next_cursor,'more',exists(
    select 1 from public.sync_changes where owner=actor and revision>next_cursor),
    'balance',(select jsonb_build_object('xp',coalesce(sum(xp),0),'gold',coalesce(sum(gold),0))
      from public.wallet_ledger where owner=actor));
end $$;
revoke all on function public.sync_pull(bigint,integer) from public,anon;
grant execute on function public.sync_pull(bigint,integer) to authenticated;

create function public.sync_record(p_kind text,p_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
  perform public.require_account_ready();
  select jsonb_build_object('kind',kind,'id',id,'version',version,'data',data,'deleted',false) into result
    from public.training_items where owner=actor and kind=p_kind and id=p_id;
  return coalesce(result,jsonb_build_object('kind',p_kind,'id',p_id,'version',coalesce((select version from public.training_tombstones
    where owner=actor and kind=p_kind and id=p_id),0),'data',null,'deleted',true));
end $$;
revoke all on function public.sync_record(text,text) from public,anon;
grant execute on function public.sync_record(text,text) to authenticated;

create function public.canonical_backup_json(value jsonb) returns jsonb
language plpgsql immutable strict set search_path='' as $$
declare result jsonb;
begin
  case jsonb_typeof(value)
    when 'number' then return to_jsonb(trim_scale(value::text::numeric));
    when 'array' then
      select coalesce(jsonb_agg(public.canonical_backup_json(element) order by position),'[]') into result
        from jsonb_array_elements(value) with ordinality as entries(element,position);
      return result;
    when 'object' then
      select coalesce(jsonb_object_agg(key,public.canonical_backup_json(element)),'{}') into result
        from jsonb_each(value) as entries(key,element);
      return result;
    else return value;
  end case;
end $$;
revoke all on function public.canonical_backup_json(jsonb) from public,anon,authenticated;

create function public.export_account_backup(p_owner uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('format','gymbeast-account','version',1,'payload',payload,'checksum',md5(payload::text))
  from (select public.canonical_backup_json(jsonb_build_object('owner',p_owner,'exported_at',statement_timestamp(),
    'items',coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'id',id,'version',version,'data',data) order by kind,id)
      from public.training_items where owner=p_owner),'[]'),
    'rewards',coalesce((select jsonb_agg(to_jsonb(r) order by session_id) from public.session_rewards r where owner=p_owner),'[]'),
    'purchases',coalesce((select jsonb_agg(to_jsonb(p) order by good) from public.pet_purchases p where owner=p_owner),'[]'),
    'ledger',coalesce((select jsonb_agg(to_jsonb(l) order by created_at,id) from public.wallet_ledger l where owner=p_owner),'[]')
  )) as payload where exists(select 1 from auth.users where id=p_owner)) snapshot;
$$;
revoke all on function public.export_account_backup(uuid) from public,anon,authenticated;
grant execute on function public.export_account_backup(uuid) to service_role;

-- Restore exact rewards and ledger entries instead of granting them again.
do $$ declare signature text; definition text; begin
  foreach signature in array array['public.award_training_session()','public.on_training_milestone()'] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    execute regexp_replace(definition,'\mbegin\M',
      'begin if coalesce(current_setting(''gymbeast.restoring'',true),'''')=''yes'' then return new; end if;', 'i');
  end loop;
end $$;

create function public.restore_account_backup(p_owner uuid,p_operation uuid,p_backup jsonb) returns void
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
  insert into public.session_rewards(owner,session_id,xp,gold,companion,occurrence,training_date,awarded_at)
    select p_owner,session_id,xp,gold,companion,occurrence,training_date,awarded_at
    from jsonb_to_recordset(payload->'rewards') as r(session_id text,xp integer,gold integer,companion text,occurrence text,training_date date,awarded_at timestamptz);
  insert into public.wallet_ledger(owner,id,source,source_id,xp,gold,created_at)
    select p_owner,id,source,source_id,xp,gold,created_at from jsonb_to_recordset(payload->'ledger') as l(
      id uuid,source text,source_id text,xp integer,gold integer,created_at timestamptz);
  select coalesce(sum(xp),0),coalesce(sum(gold),0) into ledger_xp,ledger_gold from public.wallet_ledger where owner=p_owner;
  if ledger_xp<>(select coalesce(sum(xp),0) from public.session_rewards where owner=p_owner)
    or ledger_gold<>(select coalesce(sum(gold),0) from public.session_rewards where owner=p_owner)-
      (select coalesce(sum(price),0) from public.pet_purchases where owner=p_owner) then raise exception 'Backup wallet mismatch'; end if;
  insert into public.account_restores values(p_owner,p_operation,md5(p_backup::text));
end $$;
revoke all on function public.restore_account_backup(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.restore_account_backup(uuid,uuid,jsonb) to service_role;
