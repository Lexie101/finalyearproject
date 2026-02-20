# Supabase Schema

Below is the SQL to create the tables and indexes used by the application.
Run this in your Supabase SQL editor. Adjust if you already have existing data.

```sql
-- Extensions
create extension if not exists pgcrypto;

-- 1) profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null check (role in ('student','admin','driver','super_admin')),
  full_name text,
  phone text,
  is_verified boolean not null default false,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_email_ci_idx on public.profiles (lower(email));

-- 2) otp_verifications
create table if not exists public.otp_verifications (
  id bigserial primary key,
  email text not null,
  otp_code text not null,
  expires_at timestamptz not null,
  is_used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists otp_verifications_email_created_idx
  on public.otp_verifications(email, created_at);

create index if not exists otp_verifications_email_otp_is_used_idx
  on public.otp_verifications(email, otp_code, is_used);

-- 3) admins (drivers and staff)
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,
  role text not null check (role in ('driver','super_admin','admin')),
  name text,
  phone text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists admins_role_idx on public.admins(role);
create index if not exists admins_email_ci_idx on public.admins(lower(email));

-- Optional legacy plaintext column (not used by app; for migration/debug only)
-- alter table public.admins add column if not exists password text;

-- 4) bus-locations (hyphenated table name must be quoted)
create table if not exists public."bus-locations" (
  id bigserial primary key,
  user_id text not null,
  lat double precision not null,
  lng double precision not null,
  speed double precision not null default 0,
  heading double precision not null default 0,
  bus_id text,
  created_at timestamptz not null default now()
);

create index if not exists bus_locations_created_at_idx
  on public."bus-locations"(created_at desc);

create index if not exists bus_locations_bus_id_idx
  on public."bus-locations"(bus_id);

-- 5) emergency_alerts
create table if not exists public.emergency_alerts (
  id bigserial primary key,
  driver_id uuid,
  driver_email text not null,
  driver_name text,
  bus_id text,
  latitude double precision not null,
  longitude double precision not null,
  timestamp timestamptz not null default now(),
  status text not null default 'active'
);

alter table public.emergency_alerts
  add constraint if not exists emergency_alerts_driver_id_fkey
  foreign key (driver_id) references public.admins(id) on delete set null;

create index if not exists emergency_alerts_status_idx
  on public.emergency_alerts(status);

create index if not exists emergency_alerts_timestamp_idx
  on public.emergency_alerts(timestamp desc);
```

## Seed Driver Example (Lweendo Chiblika)

Run this after the tables are created to insert the driver:

```sql
insert into public.admins (id, email, password_hash, role, name, phone, created_by)
values (
  gen_random_uuid(),
  'lweendochiblika@gmail.com',
  'Badart22',
  'driver',
  'lweendo chiblika',
  null,
  'manual_seed'
);
```

Notes
- Admins can create drivers from the dashboard; drivers then log in with email/password.
- Admin/super_admin logins use the profiles table; drivers use the admins table.
- The map and live bus tracking rely on the "bus-locations" table and real-time inserts.

