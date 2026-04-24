-- Harden profile email sync from auth.users
-- Prevent blank/null email writes from trigger paths.

-- Backfill any accidentally blank profile emails from auth.users when possible.
update public.profiles as p
set
  email = u.email,
  updated_at = now()
from auth.users as u
where p.id = u.id
  and length(trim(p.email)) = 0
  and u.email is not null
  and length(trim(u.email)) > 0;

-- Enforce non-empty emails at DB level for future writes.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_email_nonempty'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_email_nonempty
      check (length(trim(email)) > 0);
  end if;
end
$$;

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
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.handle_auth_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email
     and new.email is not null
     and length(trim(new.email)) > 0 then
    update public.profiles
    set
      email = new.email,
      updated_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;
