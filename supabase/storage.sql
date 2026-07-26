-- Storage buckets for uploaded files.
-- Run this in the Supabase Dashboard SQL Editor, AFTER schema.sql.

-- Two private buckets: one for MyChron telemetry exports, one for SmartyCam
-- videos. "Private" means files are NOT publicly accessible by URL -- a
-- driver must be logged in and own the file to download it.
insert into storage.buckets (id, name, public)
values ('telemetry', 'telemetry', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

-- Files must be uploaded to a path like: <driver_id>/<session_id>/<file_name>
-- These policies check that the first folder in the path matches the id of
-- whoever is logged in, so drivers can only reach their own folder.

create policy "Drivers can read their own telemetry files"
  on storage.objects for select
  using (
    bucket_id = 'telemetry'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Drivers can upload their own telemetry files"
  on storage.objects for insert
  with check (
    bucket_id = 'telemetry'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Drivers can delete their own telemetry files"
  on storage.objects for delete
  using (
    bucket_id = 'telemetry'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Drivers can read their own videos"
  on storage.objects for select
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Drivers can upload their own videos"
  on storage.objects for insert
  with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Drivers can delete their own videos"
  on storage.objects for delete
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
