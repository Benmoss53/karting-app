-- Stores computed analysis results for an uploaded MyChron CSV export.
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists telemetry_analysis (
  id uuid primary key default gen_random_uuid(),
  telemetry_file_id uuid not null unique references telemetry_files (id) on delete cascade,
  summary jsonb not null,
  created_at timestamptz not null default now()
);

alter table telemetry_analysis enable row level security;

create policy "Drivers can view analysis for their own files"
  on telemetry_analysis for select
  using (
    telemetry_file_id in (
      select tf.id
      from telemetry_files tf
      join sessions s on s.id = tf.session_id
      where s.driver_id = auth.uid()
    )
  );

create policy "Drivers can create analysis for their own files"
  on telemetry_analysis for insert
  with check (
    telemetry_file_id in (
      select tf.id
      from telemetry_files tf
      join sessions s on s.id = tf.session_id
      where s.driver_id = auth.uid()
    )
  );

create policy "Drivers can update analysis for their own files"
  on telemetry_analysis for update
  using (
    telemetry_file_id in (
      select tf.id
      from telemetry_files tf
      join sessions s on s.id = tf.session_id
      where s.driver_id = auth.uid()
    )
  );
