-- Adds day type/kart/motor to sessions, and simplifies weather_conditions
-- to match the fields captured when a day is created.
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

alter table sessions
  add column if not exists day_type text check (day_type in ('race_meeting', 'test_day')),
  add column if not exists kart text,
  add column if not exists motor text;

-- Weather is now captured up-front when a day is added, with a simpler set
-- of fields than before. Drop the old columns and add the new ones.
alter table weather_conditions
  drop column if exists track_conditions,
  drop column if exists air_temp,
  drop column if exists humidity,
  drop column if exists wind,
  drop column if exists notes;

alter table weather_conditions
  add column if not exists temperature text,
  add column if not exists windy boolean,
  add column if not exists sky_conditions text check (sky_conditions in ('sunny', 'overcast'));

-- track_temp already exists from 003_weather_and_coach.sql and stays as-is (optional).
