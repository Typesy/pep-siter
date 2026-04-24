-- Auth: sync public.profiles with auth.users (signup + email changes)
-- Runs as SECURITY DEFINER to bypass RLS on public.profiles.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.handle_auth_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set
      email = coalesce(new.email, ''),
      updated_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute procedure public.handle_auth_user_email_updated();
