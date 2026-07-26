-- Replaces the setup sheet fields with the real setup sheet layout
-- (matches a physical/PDF reference sheet the driver uses).
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

alter table setup_sheets
  drop column if exists rear_track,
  drop column if exists seat_position,
  drop column if exists front_crash_bar,
  drop column if exists rear_crash_bar,
  drop column if exists axle_grade,
  drop column if exists seat_grade,
  drop column if exists axle_length,
  drop column if exists seat_stays;

alter table setup_sheets
  add column if not exists front_upper_crash_bar text,
  add column if not exists front_lower_crash_bar text,
  add column if not exists torsion_bar text,
  add column if not exists front_wheels text,
  add column if not exists ackerman text,
  add column if not exists front_ride_height text,
  add column if not exists sidepods text,
  add column if not exists third_bearing text,
  add column if not exists axle text,
  add column if not exists rear_ride_height text,
  add column if not exists rear_bar text,
  add column if not exists rear_wheels text,
  -- Seat position is measured two ways: (A) height above/below the bottom
  -- of the chassis rail, and (B) a 45-degree measurement from the axle to
  -- the back of the seat.
  add column if not exists seat_position_a text,
  add column if not exists seat_position_b text;

-- camber, caster, toe, and front_track already exist from 002_setup_sheets.sql
-- and are unchanged.
