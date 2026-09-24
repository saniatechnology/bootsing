-- Auth: a users table and DB-backed sessions. Single hardcoded user today
-- (seeded with id = DEFAULT_USER_ID so it owns the pre-existing rows), but the
-- shape supports additional users later without a reshape. The app talks to the
-- database with the service-role key, so it enforces sessions in application
-- code; the RLS policies below are inert today and ready for real per-user auth.

-- gen_random_uuid() lives in pgcrypto on older Postgres; harmless if already present.
create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per active login. The cookie holds an opaque random token; only its
-- sha256 hash is stored here, so a database leak can't be used to impersonate.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz
);
create index sessions_user_idx on public.sessions (user_id);

alter table public.users enable row level security;
alter table public.sessions enable row level security;

-- Per-user policies for future auth. The app uses the service-role key (which
-- bypasses RLS), so these grant nothing today but are ready for later.
create policy "own user row" on public.users for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "own sessions" on public.sessions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
