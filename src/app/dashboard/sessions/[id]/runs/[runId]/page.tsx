import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthedUser } from "@/lib/supabase/user";
import { BUCKET_BY_TYPE } from "@/lib/storage";
import {
  submitSetupEntry,
  updateSetupEntry,
  saveSetupFeedback,
  analyzeTelemetryFile,
  deleteRun,
} from "../../actions";
import { SETUP_SHEET_FIELDS, SETUP_SHEET_GROUPS } from "@/lib/setup-sheet";
import KartDiagram from "@/components/kart-diagram";
import SpeedDistanceChart from "@/components/speed-distance-chart";
import UploadForm from "@/components/upload-form";
import DeleteFileButton from "@/components/delete-file-button";
import { dayTypeLabel } from "@/components/session-card";
import type { AimCsvSummary } from "@/lib/aim-csv";
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  errorBannerClass,
  infoBannerClass,
  backLinkClass,
  pillClass,
} from "@/lib/dark-ui";

const FIELD_BY_KEY = new Map(SETUP_SHEET_FIELDS.map((f) => [f.key, f]));

type SetupEntry = Record<string, unknown> & {
  id: string;
  run_id: string;
  feedback: string | null;
  computed_changes: string | null;
};

function formatNumber(value: number | null | undefined, digits = 0) {
  return value == null ? "—" : value.toFixed(digits);
}

export default async function RunDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; runId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, runId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const user = await getAuthedUser();

  if (!user) notFound();

  const [{ data: session }, { data: run }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, track_name, session_date, day_type")
      .eq("id", id)
      .single(),
    supabase.from("runs").select("id, run_number, session_id").eq("id", runId).single(),
  ]);

  if (!session || !run || run.session_id !== id) {
    notFound();
  }

  const [{ data: weather }, { data: thisRunEntry }, { data: files }] = await Promise.all([
    supabase
      .from("weather_conditions")
      .select("temperature, windy, track_temp, sky_conditions")
      .eq("session_id", id)
      .maybeSingle(),
    supabase.from("setup_sheets").select("*").eq("run_id", runId).maybeSingle(),
    supabase
      .from("telemetry_files")
      .select("id, file_name, file_type, storage_path, uploaded_at")
      .eq("run_id", runId)
      .order("uploaded_at", { ascending: false }),
  ]);

  // The single most recent setup entry across every run the driver has ever
  // logged, on any day — same "running base" the AI coach relies on.
  const { data: driverSessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("driver_id", user.id);
  const driverSessionIds = (driverSessions ?? []).map((s) => s.id);
  const { data: latestEntryGlobal } = driverSessionIds.length
    ? await supabase
        .from("setup_sheets")
        .select("*, runs(run_number, session_id)")
        .in("session_id", driverSessionIds)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const blockingEntry =
    !thisRunEntry && latestEntryGlobal && !latestEntryGlobal.feedback ? latestEntryGlobal : null;
  let blockingLabel: { track_name: string; session_date: string; run_number: number } | null =
    null;
  if (blockingEntry) {
    const blockingRun = (blockingEntry as unknown as { runs: { run_number: number; session_id: string } }).runs;
    const { data: blockingSession } = await supabase
      .from("sessions")
      .select("track_name, session_date")
      .eq("id", blockingRun.session_id)
      .maybeSingle();
    if (blockingSession) {
      blockingLabel = { ...blockingSession, run_number: blockingRun.run_number };
    }
  }

  const telemetryFiles = (files ?? []).filter(
    (f) => f.file_type === "mychron" || f.file_type === "other",
  );
  const videoFiles = (files ?? []).filter((f) => f.file_type === "video");

  const fileIds = telemetryFiles.map((f) => f.id);
  type AnalysisRow = { telemetry_file_id: string; summary: AimCsvSummary };
  const { data: analyses } = (fileIds.length
    ? await supabase
        .from("telemetry_analysis")
        .select("telemetry_file_id, summary")
        .in("telemetry_file_id", fileIds)
    : { data: [] as AnalysisRow[] }) as { data: AnalysisRow[] | null };
  const analysisByFileId = new Map((analyses ?? []).map((row) => [row.telemetry_file_id, row.summary]));

  const telemetryFilesWithLinks = await Promise.all(
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
  );

  const videoFilesWithLinks = await Promise.all(
    videoFiles.map(async (file) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET_BY_TYPE.video)
        .createSignedUrl(file.storage_path, 3600);
      return { ...file, downloadUrl: signed?.signedUrl ?? null };
    }),
  );

  const weatherChips = weather
    ? [
        weather.sky_conditions,
        weather.temperature,
        weather.track_temp ? `Track ${weather.track_temp}` : null,
        weather.windy === null ? null : weather.windy ? "Windy" : "Calm",
      ].filter(Boolean)
    : [];

  const values = (thisRunEntry ?? latestEntryGlobal) as SetupEntry | null;

  return (
    <div className="max-w-4xl">
      <Link href={`/dashboard/sessions/${id}`} className={backLinkClass}>
        ← {session.track_name}
      </Link>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Session {run.run_number}</h1>
        {session.day_type && <span className={pillClass}>{dayTypeLabel(session.day_type)}</span>}
      </div>
      <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
        <span className="font-mono">{session.session_date}</span>
        {weatherChips.map((chip) => (
          <span key={chip} className={`${pillClass} capitalize`}>
            {chip}
          </span>
        ))}
      </div>

      {error && <p className={`mb-6 ${errorBannerClass}`}>{error}</p>}

      {/* Setup */}
      <section className="mb-8 flex flex-col gap-6">
        <div className={cardClass}>
          <h2 className="mb-4 text-sm font-medium text-neutral-400">Kart diagram</h2>
          <KartDiagram values={values} />
        </div>

        {thisRunEntry ? (
          <>
            <form action={updateSetupEntry} className="flex flex-col gap-4">
              <input type="hidden" name="sessionId" value={id} />
              <input type="hidden" name="runId" value={runId} />
              <input type="hidden" name="entryId" value={thisRunEntry.id} />
              <SpecFields values={thisRunEntry} />
              <button type="submit" className={`self-start ${primaryButtonClass}`}>
                Update setup
              </button>
            </form>

            <div className={cardClass}>
              <h2 className="mb-1 text-sm font-medium text-neutral-400">
                How did the kart feel?
              </h2>
              <form action={saveSetupFeedback} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="sessionId" value={id} />
                <input type="hidden" name="runId" value={runId} />
                <input type="hidden" name="entryId" value={thisRunEntry.id} />
                <textarea
                  id="feedback"
                  name="feedback"
                  rows={3}
                  defaultValue={(thisRunEntry.feedback as string) ?? ""}
                  placeholder="e.g. Gave more steer into the corner but felt loose on exit"
                  className={inputClass}
                />
                <button type="submit" className={`self-start ${primaryButtonClass}`}>
                  Save feedback
                </button>
              </form>
            </div>
          </>
        ) : blockingLabel ? (
          <p className={errorBannerClass}>
            Log feedback on Session {blockingLabel.run_number} ({blockingLabel.track_name},{" "}
            {blockingLabel.session_date}) before starting a new setup here.
          </p>
        ) : (
          <>
            {latestEntryGlobal && (
              <p className={infoBannerClass}>
                Starting from your last logged setup — adjust what changed and submit.
              </p>
            )}
            <form action={submitSetupEntry} className="flex flex-col gap-4">
              <input type="hidden" name="sessionId" value={id} />
              <input type="hidden" name="runId" value={runId} />
              <SpecFields values={latestEntryGlobal as SetupEntry | null} />
              <button type="submit" className={`self-start ${primaryButtonClass}`}>
                Submit setup
              </button>
            </form>
          </>
        )}
      </section>

      {/* MyChron data */}
      <section className={`mb-8 ${cardClass}`}>
        <h2 className="mb-4 text-sm font-medium text-neutral-300">MyChron data</h2>

        {telemetryFilesWithLinks.length === 0 ? (
          <p className="mb-4 text-sm text-neutral-500">No files uploaded yet.</p>
        ) : (
          <ul className="mb-4 flex flex-col divide-y divide-neutral-800">
            {telemetryFilesWithLinks.map((file) => (
              <li key={file.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                      redirectTo={`/dashboard/sessions/${id}/runs/${runId}`}
                    />
                  </div>
                </div>

                {file.analysis ? (
                  <AnalysisSummary summary={file.analysis} />
                ) : (
                  <form action={analyzeTelemetryFile} className="mt-3">
                    <input type="hidden" name="sessionId" value={id} />
                    <input type="hidden" name="runId" value={runId} />
                    <input type="hidden" name="fileId" value={file.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition-colors hover:border-red-500/50 hover:bg-red-600/10 hover:text-red-400"
                    >
                      Analyze
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className={`mb-4 ${infoBannerClass}`}>
          Analysis works from a RaceStudio3 CSV export, not the raw MyChron file — export via{" "}
          <span className="font-mono">File → Export → CSV</span> in RaceStudio3, then upload and
          click Analyze.
        </p>

        <UploadForm
          sessionId={id}
          runId={runId}
          driverId={user.id}
          allowedTypes={[
            { value: "mychron", label: "MyChron data" },
            { value: "other", label: "Other" },
          ]}
        />
      </section>

      {/* Video */}
      <section className={`mb-8 ${cardClass}`}>
        <h2 className="mb-4 text-sm font-medium text-neutral-300">Video</h2>

        {videoFilesWithLinks.length === 0 ? (
          <p className="mb-4 text-sm text-neutral-500">No footage uploaded yet.</p>
        ) : (
          <ul className="mb-4 flex flex-col divide-y divide-neutral-800">
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
                    redirectTo={`/dashboard/sessions/${id}/runs/${runId}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <UploadForm
          sessionId={id}
          runId={runId}
          driverId={user.id}
          allowedTypes={[{ value: "video", label: "SmartyCam video" }]}
          label="Upload footage"
        />
      </section>

      <form action={deleteRun}>
        <input type="hidden" name="sessionId" value={id} />
        <input type="hidden" name="runId" value={runId} />
        <button type="submit" className="text-sm font-medium text-neutral-500 hover:text-red-400">
          Delete this session
        </button>
      </form>
    </div>
  );
}

function Row({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <label htmlFor={name} className="text-sm text-neutral-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={defaultValue ?? ""}
        className="w-32 rounded-lg border border-neutral-700 bg-neutral-800/80 px-2.5 py-1.5 text-right font-mono text-sm text-white shadow-sm transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:w-36"
      />
    </div>
  );
}

function SpecFields({ values }: { values: Record<string, unknown> | null }) {
  return (
    <>
      {SETUP_SHEET_GROUPS.map((group) => (
        <div key={group.title} className={cardClass}>
          <h2 className="mb-1 flex items-center gap-2 text-sm font-medium text-neutral-300">
            <span className="h-3.5 w-1 rounded-full bg-red-600" aria-hidden />
            {group.title.toUpperCase()}
          </h2>
          <div className="divide-y divide-neutral-800">
            {group.keys.map((key) => {
              const field = FIELD_BY_KEY.get(key)!;
              return (
                <Row
                  key={key}
                  label={field.label}
                  name={field.name}
                  defaultValue={values?.[key] as string | null | undefined}
                />
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function AnalysisSummary({ summary }: { summary: AimCsvSummary }) {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="mb-1 text-slate-400">Max RPM</dt>
          <dd className="font-mono text-slate-900">{formatNumber(summary.maxRpm)}</dd>
        </div>
        <div>
          <dt className="mb-1 text-slate-400">Min RPM</dt>
          <dd className="font-mono text-slate-900">{formatNumber(summary.minRpm)}</dd>
        </div>
        <div>
          <dt className="mb-1 text-slate-400">Max speed</dt>
          <dd className="font-mono text-slate-900">{formatNumber(summary.maxSpeedKmh, 1)} km/h</dd>
        </div>
        <div>
          <dt className="mb-1 text-slate-400">Avg speed</dt>
          <dd className="font-mono text-slate-900">{formatNumber(summary.avgSpeedKmh, 1)} km/h</dd>
        </div>
        {summary.maxLateralG != null && (
          <div>
            <dt className="mb-1 text-slate-400">Max lateral G</dt>
            <dd className="font-mono text-slate-900">{formatNumber(summary.maxLateralG, 2)}</dd>
          </div>
        )}
        {summary.avgLambda != null && (
          <div>
            <dt className="mb-1 text-slate-400">Avg lambda</dt>
            <dd className="font-mono text-slate-900">{formatNumber(summary.avgLambda, 2)}</dd>
          </div>
        )}
        {summary.minLambda != null && (
          <div>
            <dt className="mb-1 text-slate-400">Min lambda</dt>
            <dd className="font-mono text-slate-900">{formatNumber(summary.minLambda, 2)}</dd>
          </div>
        )}
        {summary.maxLambda != null && (
          <div>
            <dt className="mb-1 text-slate-400">Max lambda</dt>
            <dd className="font-mono text-slate-900">{formatNumber(summary.maxLambda, 2)}</dd>
          </div>
        )}
      </dl>

      {summary.laps.some((lap) => lap.speedTrace.length > 1) && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-medium text-slate-500">Speed by distance into lap</h3>
          <SpeedDistanceChart laps={summary.laps} />
        </div>
      )}

      {summary.laps.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-red-600 hover:text-red-700">
            Lap breakdown ({summary.laps.length} laps)
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-4">Lap</th>
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Max RPM</th>
                  <th className="pb-2 pr-4">Min RPM</th>
                  <th className="pb-2 pr-4">Max speed</th>
                  <th className="pb-2 pr-4">Max lat G</th>
                  <th className="pb-2">Avg λ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
                {summary.laps.map((lap) => (
                  <tr key={lap.lap}>
                    <td className="py-1.5 pr-4">{lap.lap}</td>
                    <td className="py-1.5 pr-4">{lap.lapTime ?? "—"}</td>
                    <td className="py-1.5 pr-4">{formatNumber(lap.maxRpm)}</td>
                    <td className="py-1.5 pr-4">{formatNumber(lap.minRpm)}</td>
                    <td className="py-1.5 pr-4">{formatNumber(lap.maxSpeedKmh, 1)} km/h</td>
                    <td className="py-1.5 pr-4">{formatNumber(lap.maxLateralG, 2)}</td>
                    <td className="py-1.5">{formatNumber(lap.avgLambda, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
