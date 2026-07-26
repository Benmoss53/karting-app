-- Adds a structured "setup sheet" per session.
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- (Run after schema.sql and storage.sql, which should already be applied.)

create table if not exists setup_sheets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions (id) on delete cascade,
  front_track text,
  rear_track text,
  caster text,
  camber text,
  toe text,
  seat_position text,
  front_crash_bar text check (front_crash_bar in ('loose', 'tight')),
  rear_crash_bar text check (rear_crash_bar in ('loose', 'tight')),
  axle_grade text,
  seat_grade text,
  axle_length text,
  seat_stays text check (seat_stays in ('on', 'off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table setup_sheets enable row level security;

create policy "Drivers can view setup sheets for their own sessions"
  on setup_sheets for select
  using (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

create policy "Drivers can create setup sheets for their own sessions"
  on setup_sheets for insert
  with check (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

create policy "Drivers can update setup sheets for their own sessions"
  on setup_sheets for update
  using (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

create policy "Drivers can delete setup sheets for their own sessions"
  on setup_sheets for delete
  using (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

-- Keeps updated_at current whenever a setup sheet is edited.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_setup_sheets_updated_at on setup_sheets;
create trigger set_setup_sheets_updated_at
  before update on setup_sheets
  for each row execute function set_updated_at();
