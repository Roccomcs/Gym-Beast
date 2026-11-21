-- A set already has its stable identity and current snapshot. Keep its cursor
-- on that row rather than duplicating 520,000 entity keys in a second table.
alter table public.training_items add column sync_revision bigint not null default 0;
update public.training_items t set sync_revision=c.revision from (
  select owner,id,max(revision) as revision from public.sync_changes where kind='set' group by owner,id
)c where t.owner=c.owner and t.kind='set' and t.id=c.id;
delete from public.sync_changes c where c.kind='set' and not c.deleted;

create function public.next_sync_revision(p_owner uuid) returns bigint language plpgsql security definer set search_path='' as $$
declare revision bigint;
begin
  insert into public.sync_heads(owner,revision) values(p_owner,1)
    on conflict(owner) do update set revision=sync_heads.revision+1 returning sync_heads.revision into revision;
  return revision;
end $$;
revoke all on function public.next_sync_revision(uuid) from public,anon,authenticated;

create or replace function public.log_training_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then
    if not exists(select 1 from auth.users where id=old.owner) then return old; end if;
    insert into public.training_tombstones values(old.owner,old.kind,old.id,old.version+1)
      on conflict(owner,kind,id) do update set version=greatest(training_tombstones.version,excluded.version);
    perform public.append_sync_change(old.owner,old.kind,old.id,old.version+1,null,true);
    return old;
  end if;
  delete from public.training_tombstones where owner=new.owner and kind=new.kind and id=new.id;
  if new.kind='set' then
    new.sync_revision:=public.next_sync_revision(new.owner);
  else
    perform public.append_sync_change(new.owner,new.kind,new.id,new.version,null,false);
  end if;
  return new;
end $$;
drop trigger log_training_change on public.training_items;
create trigger log_training_change before insert or update of data or delete on public.training_items for each row execute function public.log_training_change();
drop trigger award_training_session on public.training_items;
create trigger award_training_session after insert or update of data on public.training_items for each row execute function public.award_training_session();

-- Small integer response column; fingerprints and UUIDs are never pruned.
alter table public.training_operations add column applied_version integer;
create or replace function public.pack_operation_result() returns trigger language plpgsql set search_path='' as $$
begin
  if jsonb_typeof(new.result)='number' then new.applied_version:=(new.result::text)::integer;new.result:=null;
  elsif new.result->>'status'='applied' and jsonb_typeof(new.result->'version')='number'
    and (new.result-'status'-'version')='{}'::jsonb then new.applied_version:=(new.result->>'version')::integer;new.result:=null; end if;
  return new;
end $$;
update public.training_operations set result=result where jsonb_typeof(result)='number';

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
    return case when saved.applied_version is not null then jsonb_build_object('status','applied','version',saved.applied_version) else coalesce(saved.result,jsonb_build_object('status','applied')) end;
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


create or replace function public.sync_pull_state(p_cursor bigint default 0,p_limit integer default 250) returns jsonb
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
    from (select * from (
      select * from public.sync_changes where owner=actor and revision>p_cursor
      union all select owner,sync_revision as revision,kind,id,version,null::jsonb as data,false as deleted
        from public.training_items where owner=actor and kind='set' and sync_revision>p_cursor
    )all_keys order by revision limit p_limit)c
    left join public.training_items t on c.kind<>'reward' and t.owner=actor and t.kind=c.kind and t.id=c.id
    left join public.training_tombstones d on c.kind<>'reward' and d.owner=actor and d.kind=c.kind and d.id=c.id
    left join public.session_rewards r on c.kind='reward' and r.owner=actor and r.session_id=c.id
  )page;
  return jsonb_build_object('changes',changes,'cursor',next_cursor,'more',exists(
    select 1 from public.sync_changes where owner=actor and revision>next_cursor union all select 1 from public.training_items where owner=actor and kind='set' and sync_revision>next_cursor),
    'balance',(select jsonb_build_object('xp',coalesce(sum(xp),0),'gold',coalesce(sum(gold),0)) from public.wallet_ledger where owner=actor));
end $$;

