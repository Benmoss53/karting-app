-- Initial schema for the karting telemetry app.
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

-- 1. DRIVERS
-- One row per signed-up driver. The id is the SAME id Supabase Auth already
-- generates when someone signs up, so "drivers" is really just "extra profile
-- info about a user".
create table if not exists drivers (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- 2. SESSIONS
-- One row per track outing (e.g. a weekend session). Belongs to one driver.
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers (id) on delete cascade,
  track_name text not null,
  session_date date not null default current_date,
  setup_notes text,
  created_at timestamptz not null default now()
);

create index if not exists sessions_driver_id_idx on sessions (driver_id);

-- 3. TELEMETRY_FILES
-- One row per uploaded file (MyChron data export or SmartyCam video), linked
-- to the session it was recorded in. The actual file bytes live in Supabase
-- Storage (see storage.sql); this table just points to them.
create table if not exists telemetry_files (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  file_type text not null check (file_type in ('mychron', 'video', 'other')),
  storage_path text not null,
  file_name text not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists telemetry_files_session_id_idx on telemetry_files (session_id);

-- ROW LEVEL SECURITY
-- By default, Supabase lets any logged-in user read/write any row. These
-- policies restrict every table so a driver can only ever see or change
-- their OWN data. auth.uid() is "the id of whoever is currently logged in".

alter table drivers enable row level security;
alter table sessions enable row level security;
alter table telemetry_files enable row level security;

create policy "Drivers can view their own profile"
  on drivers for select
  using (id = auth.uid());

create policy "Drivers can update their own profile"
  on drivers for update
  using (id = auth.uid());

create policy "Drivers can view their own sessions"
  on sessions for select
  using (driver_id = auth.uid());

create policy "Drivers can create their own sessions"
  on sessions for insert
  with check (driver_id = auth.uid());

create policy "Drivers can update their own sessions"
  on sessions for update
  using (driver_id = auth.uid());

create policy "Drivers can delete their own sessions"
  on sessions for delete
  using (driver_id = auth.uid());

create policy "Drivers can view files from their own sessions"
  on telemetry_files for select
  using (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

create policy "Drivers can attach files to their own sessions"
  on telemetry_files for insert
  with check (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

create policy "Drivers can delete files from their own sessions"
  on telemetry_files for delete
  using (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

-- AUTO-CREATE A DRIVER PROFILE ON SIGNUP
-- Whenever someone signs up through Supabase Auth, automatically create a
-- matching row in "drivers" so the app never has to do it manually.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.drivers (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
