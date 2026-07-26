-- Adds weather conditions and AI Coach training entries per session.
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- (Run after schema.sql, storage.sql, and 002_setup_sheets.sql.)

-- WEATHER_CONDITIONS: one record per session.
create table if not exists weather_conditions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions (id) on delete cascade,
  track_conditions text check (track_conditions in ('dry', 'damp', 'wet')),
  air_temp text,
  track_temp text,
  humidity text,
  wind text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table weather_conditions enable row level security;

create policy "Drivers can view weather for their own sessions"
  on weather_conditions for select
  using (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

create policy "Drivers can create weather for their own sessions"
  on weather_conditions for insert
  with check (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

create policy "Drivers can update weather for their own sessions"
  on weather_conditions for update
  using (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

create policy "Drivers can delete weather for their own sessions"
  on weather_conditions for delete
  using (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

-- Reuses the same "keep updated_at current" trigger function set up in
-- 002_setup_sheets.sql. "create or replace" makes this safe to re-run.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_weather_conditions_updated_at on weather_conditions;
create trigger set_weather_conditions_updated_at
  before update on weather_conditions
  for each row execute function set_updated_at();

-- COACH_ENTRIES: many per session. Each entry is one "I changed X, the kart
-- did Y" note. This is the training data the future AI Coach will learn from.
create table if not exists coach_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  change_made text not null,
  reaction text not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_entries_session_id_idx on coach_entries (session_id);

alter table coach_entries enable row level security;

create policy "Drivers can view coach entries for their own sessions"
  on coach_entries for select
  using (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

create policy "Drivers can create coach entries for their own sessions"
  on coach_entries for insert
  with check (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

create policy "Drivers can delete coach entries for their own sessions"
  on coach_entries for delete
  using (
    session_id in (select id from sessions where driver_id = auth.uid())
  );
