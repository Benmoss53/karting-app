import type { createClient } from "@/lib/supabase/server";
import { formatLapSeconds } from "@/lib/best-lap";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type SessionOverview = {
  id: string;
  track_name: string;
  session_date: string;
  day_type: string | null;
  bestLap: string | null;
  sessionNumber: number;
};

/**
 * Sessions for the current driver, newest first, each annotated with its
 * best lap and its chronological session number. Shared between the
 * dashboard home and the full sessions list so both stay in sync.
 *
 * Best lap is read from the small `best_lap_seconds` column on
 * telemetry_analysis rather than the full stored summary — the summary
 * includes every lap's speed/RPM/lambda trace, which would be a lot of
 * data to ship for every session just to find one number.
 */
export async function loadSessionsOverview(
  supabase: SupabaseServerClient,
): Promise<SessionOverview[]> {
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, track_name, session_date, day_type")
    .order("session_date", { ascending: false });

  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);
  const { data: files } = await supabase
    .from("telemetry_files")
    .select("id, session_id")
    .eq("file_type", "mychron")
    .in("session_id", sessionIds);

  type AnalysisRow = { telemetry_file_id: string; best_lap_seconds: number };

  const fileIds = (files ?? []).map((f) => f.id);
  // Cast the whole ternary, not just the empty-array branch — the awaited
  // query's untyped `any[]` result would otherwise collapse the union and
  // silently drop the type for every downstream use of `analyses`.
  const { data: analyses } = (fileIds.length
    ? await supabase
        .from("telemetry_analysis")
        .select("telemetry_file_id, best_lap_seconds")
        .in("telemetry_file_id", fileIds)
        .not("best_lap_seconds", "is", null)
    : { data: [] as AnalysisRow[] }) as { data: AnalysisRow[] | null };

  const bestLapSecondsByFileId = new Map(
    (analyses ?? []).map((a) => [a.telemetry_file_id, a.best_lap_seconds]),
  );

  const bestLapSecondsBySession = new Map<string, number>();
  for (const file of files ?? []) {
    const seconds = bestLapSecondsByFileId.get(file.id);
    if (seconds == null) continue;
    const current = bestLapSecondsBySession.get(file.session_id);
    if (current === undefined || seconds < current) {
      bestLapSecondsBySession.set(file.session_id, seconds);
    }
  }

  // Number sessions chronologically (Session 1 = earliest), independent of
  // the newest-first display order.
  const chronological = [...sessions].sort((a, b) =>
    a.session_date.localeCompare(b.session_date),
  );
  const sessionNumber = new Map(chronological.map((s, index) => [s.id, index + 1]));

  return sessions.map((session) => {
    const bestLapSeconds = bestLapSecondsBySession.get(session.id);
    return {
      ...session,
      bestLap: bestLapSeconds === undefined ? null : formatLapSeconds(bestLapSeconds),
      sessionNumber: sessionNumber.get(session.id) ?? 0,
    };
  });
}
