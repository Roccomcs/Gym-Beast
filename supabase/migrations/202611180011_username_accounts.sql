create table public.account_invitations (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz,
  consumed_by uuid unique references auth.users(id) on delete set null,
  consumed_at timestamptz
);
create table public.account_logins (
  owner uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,24}$'),
  invitation_hash text not null references public.account_invitations(code_hash),
  registration_id uuid unique not null
);
create table public.account_attempts (
  bucket text primary key check (bucket ~ '^[0-9a-f]{64}$'),
  starts_at timestamptz not null default now(),
  attempts integer not null default 1
);
alter table public.account_invitations enable row level security;
alter table public.account_logins enable row level security;
alter table public.account_attempts enable row level security;
revoke all on public.account_invitations, public.account_logins, public.account_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.account_invitations, public.account_logins, public.account_attempts to service_role;

create function public.register_account_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  registration jsonb := new.raw_app_meta_data -> 'gymbeast_registration';
  username text := registration ->> 'handle';
  invitation text := registration ->> 'invitation_hash';
begin
  if registration is null or username is null or username !~ '^[a-z0-9_]{3,24}$'
    or new.email is distinct from ('u.' || username || '@accounts.gymbeast.invalid') then
    raise exception 'Invitation registration required';
  end if;
  update public.account_invitations set consumed_by = new.id, consumed_at = now()
    where code_hash = invitation and revoked_at is null and consumed_at is null and expires_at > now();
  if not found then raise exception 'Invitation unavailable'; end if;
  insert into public.account_logins(owner, handle, invitation_hash, registration_id)
    values(new.id, username, invitation, (registration ->> 'operation')::uuid);
  insert into public.social_profiles(owner, handle) values(new.id, username);
  return new;
end;
$$;
revoke all on function public.register_account_identity() from public, anon, authenticated;
create trigger register_gymbeast_account after insert on auth.users
  for each row execute function public.register_account_identity();

create function public.keep_login_handle() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.account_logins where owner = new.owner and handle <> new.handle) then
    raise exception 'El usuario de acceso no se puede cambiar';
  end if;
  return new;
end;
$$;
revoke all on function public.keep_login_handle() from public, anon, authenticated;
create trigger keep_login_handle before insert or update on public.social_profiles
  for each row execute function public.keep_login_handle();

create function public.allow_account_attempt(p_bucket text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  total integer;
begin
  delete from public.account_attempts where starts_at < now() - interval '1 day';
  insert into public.account_attempts(bucket) values(p_bucket)
  on conflict(bucket) do update set
    starts_at = case when account_attempts.starts_at <= now() - interval '15 minutes' then now() else account_attempts.starts_at end,
    attempts = case when account_attempts.starts_at <= now() - interval '15 minutes' then 1 else account_attempts.attempts + 1 end
  returning attempts into total;
  return total <= 10;
end;
$$;
revoke all on function public.allow_account_attempt(text) from public, anon, authenticated;
grant execute on function public.allow_account_attempt(text) to service_role;

-- Read the live administrator-owned flag so an old JWT cannot bypass a reset.
create function public.account_ready() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id = (select auth.uid())
    and coalesce(raw_app_meta_data -> 'temporary_password_required', 'false'::jsonb) = 'false'::jsonb);
$$;
revoke all on function public.account_ready() from public, anon;
grant execute on function public.account_ready() to authenticated;
create function public.require_account_ready() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.account_ready() then raise exception 'Password change required'; end if;
end;
$$;
revoke all on function public.require_account_ready() from public, anon;
grant execute on function public.require_account_ready() to authenticated;

create policy account_ready_training on public.training_items as restrictive for select to authenticated
  using ((select public.account_ready()));
create policy account_ready_rewards on public.session_rewards as restrictive for select to authenticated
  using ((select public.account_ready()));

-- Preserve the existing RPC behavior and grants while guarding every entry point.
do $$
declare
  signature text;
  definition text;
begin
  foreach signature in array array[
    'public.apply_change(uuid,text,text,integer,jsonb)', 'public.buy_pet_good(text)',
    'public.social_action(text,text,text)', 'public.friend_activity(text,text)', 'public.delete_account()'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    execute regexp_replace(definition, '\mbegin\M', 'begin perform public.require_account_ready();', 'i');
  end loop;
end;
$$;
