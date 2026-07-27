-- Adds front and rear sprocket fields to the setup sheet.
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

alter table setup_sheets
  add column if not exists front_sprocket text,
  add column if not exists rear_sprocket text;
