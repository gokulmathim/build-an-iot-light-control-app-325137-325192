-- IoT Light Control - PostgreSQL schema (reference)
-- The backend can run with SQLite fallback; use this schema if deploying to Postgres.

create table if not exists users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists devices (
  id text primary key,
  owner_user_id text not null references users(id) on delete cascade,
  external_id text not null,
  name text not null,
  room text,
  online boolean not null default true,
  is_on boolean not null default false,
  brightness double precision not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_devices_owner on devices(owner_user_id);

create table if not exists schedules (
  id text primary key,
  owner_user_id text not null references users(id) on delete cascade,
  device_id text not null references devices(id) on delete cascade,
  name text not null,
  time_local text not null,
  days_json text not null,
  action text not null,
  brightness double precision not null default 100,
  enabled boolean not null default true,
  last_ran_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_schedules_owner on schedules(owner_user_id);
create index if not exists idx_schedules_device on schedules(device_id);

create table if not exists automations (
  id text primary key,
  owner_user_id text not null references users(id) on delete cascade,
  device_id text not null references devices(id) on delete cascade,
  name text not null,
  trigger text not null,
  action text not null,
  brightness double precision not null default 100,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_automations_owner on automations(owner_user_id);
create index if not exists idx_automations_device on automations(device_id);
