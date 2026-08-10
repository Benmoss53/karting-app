-- Introduces "runs" — what the app UI calls a Session — nested inside a
-- day (the existing `sessions` table: track, date, weather, race/test type).
-- A run optionally owns one setup-sheet entry (setup is no longer mandatory
-- per run) and any number of telemetry/video files, instead of those living
-- directly on the day undifferentiated.
--
-- Existing RLS policies on setup_sheets/telemetry_files check ownership via
-- `session_id in (select id from sessions where driver_id = auth.uid())`.
-- This migration keeps `session_id` on both tables (still required, still
-- populated on every insert) and just adds a nullable `run_id` alongside it
-- for the new within-day grouping — so none of those policies need to change.
--
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  run_number integer not null,
  created_at timestamptz not null default now()
);

create index if not exists runs_session_id_idx on runs (session_id);

alter table runs enable row level security;

create policy "Drivers can view runs for their own days"
  on runs for select
  using (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

create policy "Drivers can create runs for their own days"
  on runs for insert
  with check (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

create policy "Drivers can delete runs from their own days"
  on runs for delete
  using (
    session_id in (select id from sessions where driver_id = auth.uid())
  );

alter table setup_sheets add column if not exists run_id uuid references runs (id) on delete cascade;
alter table telemetry_files add column if not exists run_id uuid references runs (id) on delete cascade;

create index if not exists setup_sheets_run_id_idx on setup_sheets (run_id);
create index if not exists telemetry_files_run_id_idx on telemetry_files (run_id);

-- BACKFILL — turn each day's existing setup_sheets rows into their own run
-- (oldest first = Session 1, 2, 3...), and attach that day's existing
-- telemetry/video files to the LAST run created for it, since the old
-- schema never tracked which setup change a file was uploaded during.
do $$
declare
  day record;
  entry record;
  new_run_id uuid;
  last_run_id uuid;
  n integer;
begin
  for day in select id from sessions loop
    n := 0;
    last_run_id := null;

    for entry in
      select id from setup_sheets where session_id = day.id and run_id is null order by created_at asc
    loop
      n := n + 1;
      insert into runs (session_id, run_number) values (day.id, n) returning id into new_run_id;
      update setup_sheets set run_id = new_run_id where id = entry.id;
      last_run_id := new_run_id;
    end loop;

    -- Day had files but zero setup entries: still needs one run to hold them.
    if last_run_id is null and exists (
      select 1 from telemetry_files where session_id = day.id and run_id is null
    ) then
      n := n + 1;
      insert into runs (session_id, run_number) values (day.id, n) returning id into last_run_id;
    end if;

    if last_run_id is not null then
      update telemetry_files set run_id = last_run_id where session_id = day.id and run_id is null;
    end if;
  end loop;
end $$;
