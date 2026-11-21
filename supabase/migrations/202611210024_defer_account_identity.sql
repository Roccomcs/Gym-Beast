-- Auth inserts the user before updating trusted app metadata in the same transaction.
create or replace function public.register_account_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  registration jsonb;
  username text;
begin
  select raw_app_meta_data -> 'gymbeast_registration' into registration
    from auth.users where id = new.id;
  username := registration ->> 'handle';
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

drop trigger register_gymbeast_account on auth.users;
create constraint trigger register_gymbeast_account
after insert on auth.users deferrable initially deferred
for each row execute function public.register_account_identity();
