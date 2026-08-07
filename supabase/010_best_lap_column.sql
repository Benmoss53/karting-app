-- Adds a small, indexable best-lap column to telemetry_analysis so the
-- dashboard's session list can read one number per file instead of pulling
-- down the entire stored summary (which includes full per-lap speed/RPM/
-- lambda traces) just to find the fastest lap. Run this once in the
-- Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

alter table telemetry_analysis add column if not exists best_lap_seconds numeric;

-- Backfill from summaries that were already analyzed before this column
-- existed, so existing sessions don't lose their best lap. Lap times are
-- stored as strings like "47.892" or "1:02.415" — parse both shapes and
-- take the minimum per file.
update telemetry_analysis ta
set best_lap_seconds = sub.best
from (
  select
    ta2.id,
    min(
      case
        when lap ->> 'lapTime' ~ '^[0-9]+:[0-9]+(\.[0-9]+)?$' then
          split_part(lap ->> 'lapTime', ':', 1)::numeric * 60
          + split_part(lap ->> 'lapTime', ':', 2)::numeric
        when lap ->> 'lapTime' ~ '^[0-9]+(\.[0-9]+)?$' then
          (lap ->> 'lapTime')::numeric
        else null
      end
    ) as best
  from telemetry_analysis ta2
  cross join lateral jsonb_array_elements(ta2.summary -> 'laps') as lap
  group by ta2.id
) as sub
where ta.id = sub.id
  and ta.best_lap_seconds is null;
