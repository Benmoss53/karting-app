-- Adds a feedback loop directly onto the setup sheet: the setup sheet
-- carries forward as the starting point each session, "computed_changes"
-- is auto-derived from a diff against the previous session's sheet at
-- submit time, and "feedback" records how the kart felt afterward.
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

alter table setup_sheets
  add column if not exists computed_changes text,
  add column if not exists feedback text;
