import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteSessionButton from "@/components/delete-session-button";
import { createRun } from "./actions";
import { cardClass, pillClass, primaryButtonClass, errorBannerClass } from "@/lib/dark-ui";
import { dayTypeLabel } from "@/components/session-card";
import { formatLapSeconds } from "@/lib/best-lap";

type RunRow = {
  id: string;
  run_number: number;
  created_at: string;
};

export default async function DayDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, track_name, session_date, setup_notes, day_type, kart, motor")
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  const [{ data: weather }, { data: runs }] = await Promise.all([
    supabase
      .from("weather_conditions")
      .select("temperature, windy, track_temp, sky_conditions")
      .eq("session_id", id)
      .maybeSingle(),
    supabase
      .from("runs")
      .select("id, run_number, created_at")
      .eq("session_id", id)
      .order("run_number", { ascending: true }),
  ]);

  const runRows = (runs ?? []) as RunRow[];
  const runIds = runRows.map((r) => r.id);

  const [{ data: setupEntries }, { data: files }] = await Promise.all([
    runIds.length
      ? supabase
          .from("setup_sheets")
          .select("id, run_id, computed_changes, feedback")
          .in("run_id", runIds)
      : Promise.resolve({ data: [] as { id: string; run_id: string; computed_changes: string | null; feedback: string | null }[] }),
    runIds.length
      ? supabase.from("telemetry_files").select("id, run_id, file_type").in("run_id", runIds)
      : Promise.resolve({ data: [] as { id: string; run_id: string; file_type: string }[] }),
  ]);

  const setupByRunId = new Map((setupEntries ?? []).map((row) => [row.run_id, row]));

  const mychronFileIdsByRun = new Map<string, string[]>();
  const videoCountByRun = new Map<string, number>();
  for (const file of files ?? []) {
    if (file.file_type === "video") {
      videoCountByRun.set(file.run_id, (videoCountByRun.get(file.run_id) ?? 0) + 1);
    } else {
      const list = mychronFileIdsByRun.get(file.run_id) ?? [];
      list.push(file.id);
      mychronFileIdsByRun.set(file.run_id, list);
    }
  }

  const allMychronFileIds = [...mychronFileIdsByRun.values()].flat();
  type AnalysisRow = { telemetry_file_id: string; best_lap_seconds: number | null };
  const { data: analyses } = (allMychronFileIds.length
    ? await supabase
        .from("telemetry_analysis")
        .select("telemetry_file_id, best_lap_seconds")
        .in("telemetry_file_id", allMychronFileIds)
    : { data: [] as AnalysisRow[] }) as { data: AnalysisRow[] | null };
  const bestLapByFileId = new Map((analyses ?? []).map((a) => [a.telemetry_file_id, a.best_lap_seconds]));

  const weatherChips = weather
    ? [
        weather.sky_conditions,
        weather.temperature,
        weather.track_temp ? `Track ${weather.track_temp}` : null,
        weather.windy === null ? null : weather.windy ? "Windy" : "Calm",
      ].filter(Boolean)
    : [];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">{session.track_name}</h1>
      <div className="mb-8 mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
        <span className="font-mono">{session.session_date}</span>
        {session.day_type && <span className={pillClass}>{dayTypeLabel(session.day_type)}</span>}
        {session.kart && <span className="font-mono">Kart: {session.kart}</span>}
        {session.motor && <span className="font-mono">Motor: {session.motor}</span>}
        {weatherChips.map((chip) => (
          <span key={chip} className={`${pillClass} capitalize`}>
            {chip}
          </span>
        ))}
      </div>

      {error && <p className={`mb-6 ${errorBannerClass}`}>{error}</p>}

      {session.setup_notes && (
        <div className={`mb-6 ${cardClass}`}>
          <h2 className="mb-2 text-sm font-medium text-neutral-400">Notes</h2>
          <p className="whitespace-pre-wrap text-white">{session.setup_notes}</p>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Sessions</h2>
        <form action={createRun}>
          <input type="hidden" name="sessionId" value={session.id} />
          <button type="submit" className={primaryButtonClass}>
            Add Session
          </button>
        </form>
      </div>

      {runRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 px-6 py-12 text-center">
          <p className="text-sm text-neutral-500">
            No sessions logged for this day yet. Add one to start tracking setup, telemetry, and
            video.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {runRows.map((run) => {
            const setup = setupByRunId.get(run.id);
            const mychronFileIds = mychronFileIdsByRun.get(run.id) ?? [];
            const videoCount = videoCountByRun.get(run.id) ?? 0;
            const bestLapSeconds = mychronFileIds.reduce<number | null>((best, fileId) => {
              const seconds = bestLapByFileId.get(fileId);
              if (seconds == null) return best;
              return best === null || seconds < best ? seconds : best;
            }, null);

            let setupStatus: string;
            if (!setup) {
              setupStatus = "No setup logged";
            } else if (!setup.feedback) {
              setupStatus = "Feedback pending";
            } else {
              setupStatus = setup.computed_changes ?? "No changes recorded";
            }

            return (
              <li key={run.id}>
                <Link
                  href={`/dashboard/sessions/${id}/runs/${run.id}`}
                  className="flex flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-600/50 hover:shadow-md active:translate-y-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-white">Session {run.run_number}</span>
                    <p className="mt-1 truncate text-sm text-neutral-400">{setupStatus}</p>
                    <p className="mt-1 font-mono text-xs text-neutral-600">
                      {mychronFileIds.length} MyChron file{mychronFileIds.length === 1 ? "" : "s"}
                      {" · "}
                      {videoCount} video{videoCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  {bestLapSeconds != null && (
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                        Best lap
                      </p>
                      <p className="font-mono text-base font-semibold text-white">
                        {formatLapSeconds(bestLapSeconds)}
                      </p>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8">
        <DeleteSessionButton sessionId={session.id} trackName={session.track_name} />
      </div>
    </div>
  );
}
