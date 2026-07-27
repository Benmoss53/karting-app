-- Setup sheets become a running log instead of one snapshot per session:
-- every submitted change is its own row, so a single day can have several
-- entries (submit setup -> log what it did -> that becomes the base for
-- the next change). Drops the one-per-session constraint from
-- 002_setup_sheets.sql and adds an index in its place.
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

alter table setup_sheets
  drop constraint if exists setup_sheets_session_id_key;

create index if not exists setup_sheets_session_id_idx on setup_sheets (session_id);
