import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_BY_TYPE } from "@/lib/storage";
import DeleteSessionButton from "@/components/delete-session-button";
import DeleteFileButton from "@/components/delete-file-button";
import SetupEntryLog from "@/components/setup-entry-log";
import { SETUP_SHEET_FIELDS } from "@/lib/setup-sheet";
import { formatLapSeconds, parseLapTimeSeconds } from "@/lib/best-lap";
import { cardClass, pillClass, errorBannerClass } from "@/lib/dark-ui";
import type { AimCsvSummary } from "@/lib/aim-csv";

const DAY_TYPE_LABEL: Record<string, string> = {
  race_meeting: "Race meeting",
  test_day: "Test day",
};

const FILE_TYPE_BADGE: Record<string, string> = {
  mychron: "bg-red-950/40 text-red-300 ring-1 ring-inset ring-red-900",
  other: "bg-neutral-800 text-neutral-300 ring-1 ring-inset ring-neutral-700",
};

type Entry = Record<string, unknown> & { id: string };

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5z" />
    </svg>
  );
}

function GaugeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 14l4-4" />
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="M4 15h1M19 15h1M6 8l.7.7M18 8l-.7.7" />
    </svg>
  );
}

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M8 5v14M16 5v14M3 10h5M16 10h5M3 15h5M16 15h5" />
    </svg>
  );
}

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, track_name, session_date, setup_notes, day_type, kart, motor")
    .eq("id", id)
    .single();

  if (!session || !user) {
    notFound();
  }

  const [{ data: weather }, { data: setupEntries }, { data: files }] = await Promise.all([
    supabase
      .from("weather_conditions")
      .select("temperature, windy, track_temp, sky_conditions")
      .eq("session_id", id)
      .maybeSingle(),
    supabase.from("setup_sheets").select("*").eq("session_id", id).order("created_at", { ascending: true }),
    supabase
      .from("telemetry_files")
      .select("id, file_name, file_type, storage_path, uploaded_at")
      .eq("session_id", id)
      .order("uploaded_at", { ascending: false }),
  ]);

  const telemetryFiles = (files ?? []).filter(
    (file) => file.file_type === "mychron" || file.file_type === "other",
  );
  const videoFiles = (files ?? []).filter((file) => file.file_type === "video");

  const fileIds = telemetryFiles.map((file) => file.id);
  const { data: analyses } = fileIds.length
    ? await supabase
        .from("telemetry_analysis")
        .select("telemetry_file_id, summary, best_lap_seconds")
        .in("telemetry_file_id", fileIds)
    : {
        data: [] as {
          telemetry_file_id: string;
          summary: AimCsvSummary;
          best_lap_seconds: number | null;
        }[],
      };

  const analysisByFileId = new Map((analyses ?? []).map((row) => [row.telemetry_file_id, row]));

  const [telemetryFilesWithLinks, videoFilesWithLinks] = await Promise.all([
    Promise.all(
      telemetryFiles.map(async (file) => {
        const bucket = BUCKET_BY_TYPE[file.file_type] ?? "telemetry";
        const { data: signed } = await supabase.storage
          .from(bucket)
          .createSignedUrl(file.storage_path, 3600);
        return {
          ...file,
          downloadUrl: signed?.signedUrl ?? null,
          analysis: analysisByFileId.get(file.id) ?? null,
        };
      }),
    ),
    Promise.all(
      videoFiles.map(async (file) => {
        const { data: signed } = await supabase.storage
          .from(BUCKET_BY_TYPE.video)
          .createSignedUrl(file.storage_path, 3600);
        return { ...file, downloadUrl: signed?.signedUrl ?? null };
      }),
    ),
  ]);

  const entries = (setupEntries ?? []) as Entry[];
  const latestEntry = entries[entries.length - 1];
  const filledFields = SETUP_SHEET_FIELDS.filter(({ key }) => latestEntry?.[key]);
  const pendingFeedback = entries.some((entry) => !entry.feedback);

  const weatherChips = weather
    ? [
        weather.sky_conditions,
        weather.temperature,
        weather.track_temp ? `Track ${weather.track_temp}` : null,
        weather.windy === null ? null : weather.windy ? "Windy" : "Calm",
      ].filter(Boolean)
    : [];

  const filesWithLaps = telemetryFilesWithLinks.filter(
    (file) => (file.analysis?.summary?.laps?.length ?? 0) > 0,
  );

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">{session.track_name}</h1>
      <div className="mb-8 mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
        <span className="font-mono">{session.session_date}</span>
        {session.day_type && (
          <span className={pillClass}>{DAY_TYPE_LABEL[session.day_type] ?? session.day_type}</span>
        )}
        {session.kart && <span className="font-mono">Kart: {session.kart}</span>}
        {session.motor && <span className="font-mono">Motor: {session.motor}</span>}
        {weatherChips.map((chip) => (
          <span key={chip} className={`${pillClass} capitalize`}>
            {chip}
          </span>
        ))}
      </div>

      {error && <p className={`mb-6 ${errorBannerClass}`}>{error}</p>}

      {/* Setup notes */}
      <section className={`mb-6 ${cardClass}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
            <WrenchIcon className="h-4 w-4 text-red-500" />
            Setup
          </h2>
          <Link
            href={`/dashboard/sessions/${id}/setup`}
            className="text-sm font-medium text-red-400 hover:text-red-300"
          >
            {entries.length === 0 ? "Start setup sheet →" : "Edit / log feedback →"}
          </Link>
        </div>

        {session.setup_notes && (
          <p className="mb-4 whitespace-pre-wrap text-sm text-white">{session.setup_notes}</p>
        )}

        {entries.length === 0 ? (
          <p className="text-sm text-neutral-500">No setup sheet saved for this day yet.</p>
        ) : (
          <>
            {filledFields.length > 0 && (
              <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                {filledFields.map(({ label, key }) => (
                  <div key={key}>
                    <dt className="text-xs text-neutral-500">{label}</dt>
                    <dd className="font-mono text-neutral-200">{latestEntry[key] as string}</dd>
                  </div>
                ))}
              </dl>
            )}
            {pendingFeedback && (
              <p className="mb-3 text-xs italic text-neutral-500">
                Latest change is waiting on feedback.
              </p>
            )}
            <SetupEntryLog entries={entries} compact />
          </>
        )}
      </section>

      {/* Lap time summary */}
      {filesWithLaps.length > 0 && (
        <section className={`mb-6 ${cardClass}`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
            <GaugeIcon className="h-4 w-4 text-red-500" />
            Lap times
          </h2>
          <div className="flex flex-col gap-4">
            {filesWithLaps.map((file) => {
              const laps = file.analysis!.summary.laps;
              const bestSeconds =
                file.analysis!.best_lap_seconds ??
                laps.reduce<number | null>((best, lap) => {
                  if (!lap.lapTime) return best;
                  const seconds = parseLapTimeSeconds(lap.lapTime);
                  if (seconds === null) return best;
                  return best === null || seconds < best ? seconds : best;
                }, null);

              return (
                <div key={file.id}>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="min-w-0 truncate text-xs font-medium text-neutral-400">
                      {file.file_name}
                    </span>
                    {bestSeconds != null && (
                      <span className="shrink-0 font-mono text-sm font-semibold text-red-400">
                        Fastest: {formatLapSeconds(bestSeconds)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {laps.map((lap) => {
                      const seconds = lap.lapTime ? parseLapTimeSeconds(lap.lapTime) : null;
                      const isBest =
                        seconds != null && bestSeconds != null && seconds === bestSeconds;
                      return (
                        <span
                          key={lap.lap}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs ${
                            isBest
                              ? "bg-red-600/15 text-red-300 ring-1 ring-inset ring-red-600/40"
                              : "bg-neutral-800 text-neutral-300"
                          }`}
                        >
                          <span className="text-neutral-500">L{lap.lap}</span>
                          {lap.lapTime ?? "—"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Telemetry / MyChron files */}
      <section className={`mb-6 ${cardClass}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
            <GaugeIcon className="h-4 w-4 text-red-500" />
            MyChron data
          </h2>
          <Link
            href={`/dashboard/sessions/${id}/mychron`}
            className="text-sm font-medium text-red-400 hover:text-red-300"
          >
            Upload / analyze →
          </Link>
        </div>

        {telemetryFilesWithLinks.length === 0 ? (
          <p className="text-sm text-neutral-500">No files uploaded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-800">
            {telemetryFilesWithLinks.map((file) => (
              <li
                key={file.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="truncate text-sm text-white">{file.file_name}</span>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                      FILE_TYPE_BADGE[file.file_type] ?? FILE_TYPE_BADGE.other
                    }`}
                  >
                    {file.file_type}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {file.downloadUrl ? (
                    <a
                      href={file.downloadUrl}
                      className="text-sm font-medium text-red-400 hover:text-red-300"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-sm text-neutral-500">Unavailable</span>
                  )}
                  <DeleteFileButton
                    sessionId={id}
                    fileId={file.id}
                    fileName={file.file_name}
                    redirectTo={`/dashboard/sessions/${id}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Video files */}
      <section className={`mb-6 ${cardClass}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
            <FilmIcon className="h-4 w-4 text-red-500" />
            Video
          </h2>
          <Link
            href={`/dashboard/sessions/${id}/videos`}
            className="text-sm font-medium text-red-400 hover:text-red-300"
          >
            Upload footage →
          </Link>
        </div>

        {videoFilesWithLinks.length === 0 ? (
          <p className="text-sm text-neutral-500">No footage uploaded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-800">
            {videoFilesWithLinks.map((file) => (
              <li
                key={file.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0 truncate text-sm text-white">{file.file_name}</span>
                <div className="flex shrink-0 items-center gap-4">
                  {file.downloadUrl ? (
                    <a
                      href={file.downloadUrl}
                      className="text-sm font-medium text-red-400 hover:text-red-300"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-sm text-neutral-500">Unavailable</span>
                  )}
                  <DeleteFileButton
                    sessionId={id}
                    fileId={file.id}
                    fileName={file.file_name}
                    redirectTo={`/dashboard/sessions/${id}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DeleteSessionButton sessionId={session.id} trackName={session.track_name} />
    </div>
  );
}
