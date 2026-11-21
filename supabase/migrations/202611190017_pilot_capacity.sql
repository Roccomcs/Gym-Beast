-- Keep operation identities/fingerprints forever; compact only the redundant response.
create function public.pack_operation_result() returns trigger language plpgsql set search_path='' as $$
begin
  if new.result->>'status'='applied' and jsonb_typeof(new.result->'version')='number'
    and (new.result-'status'-'version')='{}'::jsonb then new.result:=new.result->'version'; end if;
  return new;
end $$;
revoke all on function public.pack_operation_result() from public,anon,authenticated;
create trigger pack_operation_result before insert or update on public.training_operations
for each row execute function public.pack_operation_result();
update public.training_operations set result=result->'version' where result->>'status'='applied'
  and jsonb_typeof(result->'version')='number' and (result-'status'-'version')='{}'::jsonb;

create or replace function public.apply_training_operation(p_operation uuid,p_kind text,p_id text,p_base integer,p_data jsonb,p_delete boolean)
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
    return case when jsonb_typeof(saved.result)='number' then jsonb_build_object('status','applied','version',saved.result) else coalesce(saved.result,jsonb_build_object('status','applied')) end;
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

-- The change log is a cursor of entity keys, not a second copy of every snapshot.
-- MVCC makes the hydrated state and its version consistent inside sync_pull.
create or replace function public.append_sync_change(p_owner uuid,p_kind text,p_id text,p_version integer,p_data jsonb,p_deleted boolean)
returns void language plpgsql security definer set search_path='' as $$
declare next_revision bigint;
begin
  if not exists(select 1 from auth.users where id=p_owner) then return; end if;
  insert into public.sync_heads(owner,revision) values(p_owner,1)
    on conflict(owner) do update set revision=sync_heads.revision+1 returning revision into next_revision;
  insert into public.sync_changes values(p_owner,next_revision,p_kind,p_id,p_version,null,p_deleted);
end $$;
update public.sync_changes set data=null where data is not null;

create or replace function public.sync_pull(p_cursor bigint default 0,p_limit integer default 250) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); changes jsonb; next_cursor bigint;
begin
  perform public.require_account_ready();
  if p_cursor is null or p_limit is null or p_cursor<0 or p_limit not between 1 and 250 then raise exception 'Invalid cursor'; end if;
  select coalesce(jsonb_agg(to_jsonb(page) order by revision),'[]'),coalesce(max(revision),p_cursor) into changes,next_cursor
  from (
    select c.revision,c.kind,c.id,
      case when c.kind='reward' then 0 else coalesce(t.version,d.version,c.version) end as version,
      case when c.kind='reward' then to_jsonb(r) else t.data end as data,
      case when c.kind='reward' then r.session_id is null else t.id is null end as deleted
    from (select * from public.sync_changes where owner=actor and revision>p_cursor order by revision limit p_limit)c
    left join public.training_items t on c.kind<>'reward' and t.owner=actor and t.kind=c.kind and t.id=c.id
    left join public.training_tombstones d on c.kind<>'reward' and d.owner=actor and d.kind=c.kind and d.id=c.id
    left join public.session_rewards r on c.kind='reward' and r.owner=actor and r.session_id=c.id
  )page;
  return jsonb_build_object('changes',changes,'cursor',next_cursor,'more',exists(
    select 1 from public.sync_changes where owner=actor and revision>next_cursor),
    'balance',(select jsonb_build_object('xp',coalesce(sum(xp),0),'gold',coalesce(sum(gold),0)) from public.wallet_ledger where owner=actor));
end $$;

-- No time-based pruning of operation UUIDs, ledger or deletion markers.
-- Only superseded keys can be removed, since their latest revision stays visible
-- to every older cursor. Service-only, explicit administrative maintenance.
create function public.compact_sync_history() returns bigint language plpgsql security definer set search_path='' as $$
declare removed bigint;
begin
  with obsolete as (select owner,revision,row_number() over(partition by owner,kind,id order by revision desc) as position from public.sync_changes)
  delete from public.sync_changes c using obsolete o where c.owner=o.owner and c.revision=o.revision and o.position>1;
  get diagnostics removed=row_count;
  delete from public.account_attempts where starts_at < now()-interval '1 day';
  return removed;
end $$;
revoke all on function public.compact_sync_history() from public,anon,authenticated;
grant execute on function public.compact_sync_history() to service_role;

create function public.pilot_storage_report() returns jsonb language sql security definer set search_path='' as $$
  select jsonb_build_object('database_bytes',pg_database_size(current_database()),'tables',(
    select coalesce(jsonb_agg(jsonb_build_object('name',relname,'bytes',pg_total_relation_size(oid),'index_bytes',pg_indexes_size(oid)) order by relname),'[]')
    from pg_class where relnamespace='public'::regnamespace and relkind='r'));
$$;
revoke all on function public.pilot_storage_report() from public,anon,authenticated;
grant execute on function public.pilot_storage_report() to service_role;

