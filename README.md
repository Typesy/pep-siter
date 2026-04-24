# Pep Siter

Research-products ecommerce MVP built with Next.js, TypeScript, Tailwind, and Supabase.

## Phase 1 setup

- Next.js App Router with TypeScript
- TailwindCSS configured
- Supabase browser/server helpers added
- Base architecture folders created

## Phase 3 — Auth and profiles

- Email/password **sign up** (`/signup`) and **sign in** (`/login`)
- Session cookies refreshed via **middleware** (`middleware.ts` + `lib/supabase/middleware.ts`)
- `public.profiles` row created by a **database trigger** when `auth.users` is inserted (see `supabase/migrations/20260425120000_auth_profile_triggers.sql`)
- **`/admin`** requires a signed-in user with `profiles.is_admin = true`

### Making your first admin user

`is_admin` defaults to `false`. After your profile exists, set admin in Supabase SQL (Dashboard → SQL) for your user id, for example:

```sql
update public.profiles
set is_admin = true
where email = 'you@example.com';
```

Use the same email you signed up with. Then sign out and sign in again if the home page still caches the old profile (or hard-refresh).

## Getting started

1. Copy `.env.local.example` to `.env.local`.
2. Add Supabase values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Apply database migrations in your Supabase project (CLI `supabase db push`, linked reset, or paste SQL from `supabase/migrations/` in the SQL editor).
4. Install dependencies:
   - `npm install`
5. Run development server:
   - `npm run dev`
