-- Expands day_type from a race/test binary to four real categories
-- (race, practice, test, other) and adds an optional time-of-day for a
-- session, both needed for the redesigned Sessions list (filter tabs,
-- session cards showing a time alongside the date). Run this once in the
-- Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

alter table sessions drop constraint if exists sessions_day_type_check;
alter table sessions add constraint sessions_day_type_check
  check (day_type in ('race_meeting', 'practice', 'test_day', 'other'));

alter table sessions add column if not exists session_time time;
