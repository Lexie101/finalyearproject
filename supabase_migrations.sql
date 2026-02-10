-- Supabase migration: create tables for users, otps, locations
-- Run this in the SQL editor on your Supabase project

-- 1) users table
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  role text default 'student',
  created_at timestamptz default now()
);

-- 2) otps table
create table if not exists public.otps (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  code text not null,
  used boolean default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_otps_email_used_created on public.otps (email, used, created_at desc);

-- 3) locations table
create table if not exists public.locations (
  id uuid default gen_random_uuid() primary key,
  user_id text,
  lat double precision not null,
  lng double precision not null,
  speed double precision default 0,
  heading double precision default 0,
  bus_id text,
  created_at timestamptz default now()
);

create index if not exists idx_locations_bus_created on public.locations (bus_id, created_at desc);
create index if not exists idx_locations_user_created on public.locations (user_id, created_at desc);

-- 4) emergency_alerts table
create table if not exists public.emergency_alerts (
  id uuid default gen_random_uuid() primary key,
  driver_id uuid not null,
  driver_email text not null,
  driver_name text,
  bus_id text not null,
  latitude double precision not null,
  longitude double precision not null,
  status text default 'active',
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_emergency_driver_created on public.emergency_alerts (driver_id, created_at desc);
create index if not exists idx_emergency_status_created on public.emergency_alerts (status, created_at desc);

-- OPTIONAL: enable Row Level Security and example policy for users table
-- alter table public.users enable row level security;
-- create policy "Allow select for authenticated" on public.users
--   for select using (auth.role() is not null);
