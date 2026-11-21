alter table public.account_logins alter column invitation_hash drop not null;

create or replace function public.register_account_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  registration jsonb := new.raw_app_meta_data -> 'gymbeast_registration';
  username text := registration ->> 'handle';
begin
  if registration is null or username is null or username !~ '^[a-z]{3,24}$'
    or new.email is distinct from ('u.' || username || '@accounts.gymbeast.invalid') then
    raise exception 'Invalid GymBeast registration';
  end if;
  insert into public.account_logins(owner, handle, registration_id)
    values(new.id, username, (registration ->> 'operation')::uuid);
  insert into public.social_profiles(owner, handle) values(new.id, username);
  return new;
end;
$$;
