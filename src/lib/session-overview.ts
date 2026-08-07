import type { createClient } from "@/lib/supabase/server";
import type { AimCsvSummary } from "@/lib/aim-csv";
import { bestLapFromSummaries } from "@/lib/best-lap";

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
 * best lap (drawn from any analyzed MyChron files) and its chronological
 * session number. Shared between the dashboard home and the full sessions
 * list so both stay in sync.
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

  const fileIds = (files ?? []).map((f) => f.id);
  const { data: analyses } = fileIds.length
    ? await supabase
        .from("telemetry_analysis")
        .select("telemetry_file_id, summary")
        .in("telemetry_file_id", fileIds)
    : { data: [] as { telemetry_file_id: string; summary: AimCsvSummary }[] };

  const summaryByFileId = new Map(
    (analyses ?? []).map((a) => [a.telemetry_file_id as string, a.summary as AimCsvSummary]),
  );

  const summariesBySession = new Map<string, AimCsvSummary[]>();
  for (const file of files ?? []) {
    const summary = summaryByFileId.get(file.id);
    if (!summary) continue;
    const list = summariesBySession.get(file.session_id) ?? [];
    list.push(summary);
    summariesBySession.set(file.session_id, list);
  }

  // Number sessions chronologically (Session 1 = earliest), independent of
  // the newest-first display order.
  const chronological = [...sessions].sort((a, b) =>
    a.session_date.localeCompare(b.session_date),
  );
  const sessionNumber = new Map(chronological.map((s, index) => [s.id, index + 1]));

  return sessions.map((session) => ({
    ...session,
    bestLap: bestLapFromSummaries(summariesBySession.get(session.id) ?? []),
    sessionNumber: sessionNumber.get(session.id) ?? 0,
  }));
}
