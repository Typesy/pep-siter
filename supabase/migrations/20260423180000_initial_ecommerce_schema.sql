-- Initial ecommerce schema (MVP)
-- Source of truth: docs/schemas.md

-- ---------------------------------------------------------------------------
-- Private helpers (SECURITY DEFINER kept out of exposed API surface)
-- ---------------------------------------------------------------------------

create schema if not exists private;

-- Reads profiles.is_admin without triggering RLS recursion on public.profiles policies.
create or replace function private.current_profile_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.is_admin
      from public.profiles as p
      where p.id = auth.uid()
      limit 1
    ),
    false
  );
$$;

revoke all on function private.current_profile_is_admin() from public;
grant execute on function private.current_profile_is_admin() to authenticated;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  slug text not null unique,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references public.profiles (id) on delete restrict,
  guest_email text,
  status text not null default 'pending' check (
    status in (
      'pending',
      'paid',
      'processing',
      'shipped',
      'completed',
      'cancelled'
    )
  ),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now (),
  constraint orders_guest_email_required check (
    (user_id is not null)
    or (
      user_id is null
      and guest_email is not null
      and length(trim(guest_email)) > 0
    )
  ),
  constraint orders_total_check check (
    total_cents = subtotal_cents + shipping_cents
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now(),
  constraint order_items_line_total check (
    line_total_cents = unit_price_cents * quantity
  )
);

create table public.addresses (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now ()
);

create table public.payments (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  provider text not null default 'authorize_net',
  provider_transaction_id text,
  status text not null default 'pending' check (
    status in (
      'pending',
      'authorized',
      'paid',
      'failed',
      'cancelled',
      'refunded'
    )
  ),
  amount_cents integer not null check (amount_cents >= 0),
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now ()
);

-- ---------------------------------------------------------------------------
-- Indexes (minimal)
-- ---------------------------------------------------------------------------

create index orders_user_id_idx on public.orders (user_id);
create index orders_guest_email_idx on public.orders (guest_email);
create index order_items_order_id_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute procedure public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

create trigger addresses_set_updated_at
before update on public.addresses
for each row execute procedure public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Guest orders and sensitive writes are intended for server-side service role.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.addresses enable row level security;
alter table public.payments enable row level security;

-- profiles
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy profiles_select_admin
on public.profiles
for select
to authenticated
using (private.current_profile_is_admin());

-- products: public read of active catalog; admins manage all rows
create policy products_select_active_public
on public.products
for select
using (is_active = true);

create policy products_admin_all
on public.products
for all
to authenticated
using (private.current_profile_is_admin())
with check (private.current_profile_is_admin());

-- orders: customers read own orders only; admins manage all
create policy orders_select_own
on public.orders
for select
to authenticated
using (user_id = auth.uid());

create policy orders_admin_all
on public.orders
for all
to authenticated
using (private.current_profile_is_admin())
with check (private.current_profile_is_admin());

-- order_items: readable when tied to the user's order; admins full access
create policy order_items_select_own
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders as o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

create policy order_items_admin_all
on public.order_items
for all
to authenticated
using (private.current_profile_is_admin())
with check (private.current_profile_is_admin());

-- addresses
create policy addresses_select_own
on public.addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.orders as o
    where o.id = addresses.order_id
      and o.user_id = auth.uid()
  )
);

create policy addresses_admin_all
on public.addresses
for all
to authenticated
using (private.current_profile_is_admin())
with check (private.current_profile_is_admin());

-- payments
create policy payments_select_own
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.orders as o
    where o.id = payments.order_id
      and o.user_id = auth.uid()
  )
);

create policy payments_admin_all
on public.payments
for all
to authenticated
using (private.current_profile_is_admin())
with check (private.current_profile_is_admin());
