import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_BY_TYPE } from "@/lib/storage";
import UploadForm from "@/components/upload-form";
import DeleteFileButton from "@/components/delete-file-button";
import SpeedDistanceChart from "@/components/speed-distance-chart";
import { analyzeTelemetryFile } from "../actions";
import type { AimCsvSummary } from "@/lib/aim-csv";

const FILE_TYPE_BADGE: Record<string, string> = {
  mychron: "bg-blue-500/10 text-blue-300 ring-1 ring-inset ring-blue-400/20",
  other: "bg-white/5 text-zinc-300 ring-1 ring-inset ring-white/10",
};

function formatNumber(value: number | null, digits = 0) {
  return value === null ? "—" : value.toFixed(digits);
}

export default async function MyChronDataPage({
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
    .select("id, track_name")
    .eq("id", id)
    .single();

  if (!session || !user) {
    notFound();
  }

  const { data: files } = await supabase
    .from("telemetry_files")
    .select("id, file_name, file_type, storage_path, uploaded_at")
    .eq("session_id", id)
    .in("file_type", ["mychron", "other"])
    .order("uploaded_at", { ascending: false });

  const fileIds = (files ?? []).map((file) => file.id);
  const { data: analyses } = fileIds.length
    ? await supabase
        .from("telemetry_analysis")
        .select("telemetry_file_id, summary")
        .in("telemetry_file_id", fileIds)
    : { data: [] as { telemetry_file_id: string; summary: AimCsvSummary }[] };

  const analysisByFileId = new Map(
    (analyses ?? []).map((row) => [row.telemetry_file_id, row.summary as AimCsvSummary]),
  );

  const filesWithLinks = await Promise.all(
    (files ?? []).map(async (file) => {
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

  return (
    <div className="max-w-4xl">
      <Link
        href={`/dashboard/sessions/${id}`}
        className="mb-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
      >
        ← {session.track_name}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-50">
        Upload MyChron Data
      </h1>

      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-400/20">
          {error}
        </p>
      )}

      <div className="mb-6 rounded-xl border border-white/10 bg-zinc-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur-sm">
        {filesWithLinks.length === 0 ? (
          <p className="text-sm text-zinc-500">No files uploaded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10">
            {filesWithLinks.map((file) => (
              <li key={file.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-100">{file.file_name}</span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                        FILE_TYPE_BADGE[file.file_type] ?? FILE_TYPE_BADGE.other
                      }`}
                    >
                      {file.file_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {file.downloadUrl ? (
                      <a
                        href={file.downloadUrl}
                        className="text-sm font-medium text-blue-400 hover:text-blue-300"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-sm text-zinc-500">Unavailable</span>
                    )}
                    <DeleteFileButton
                      sessionId={id}
                      fileId={file.id}
                      fileName={file.file_name}
                    />
                  </div>
                </div>

                {file.analysis ? (
                  <AnalysisSummary summary={file.analysis} />
                ) : (
                  <form action={analyzeTelemetryFile} className="mt-3">
                    <input type="hidden" name="sessionId" value={id} />
                    <input type="hidden" name="fileId" value={file.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-300"
                    >
                      Analyze
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mb-6 rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-300 ring-1 ring-inset ring-blue-400/20">
        Analysis works from a RaceStudio3 CSV export, not the raw MyChron file — export via{" "}
        <span className="font-mono">File → Export → CSV</span> in RaceStudio3, then upload and
        click Analyze.
      </p>

      <UploadForm
        sessionId={session.id}
        driverId={user.id}
        allowedTypes={[
          { value: "mychron", label: "MyChron data" },
          { value: "other", label: "Other" },
        ]}
      />
    </div>
  );
}

function AnalysisSummary({ summary }: { summary: AimCsvSummary }) {
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-zinc-950/40 p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="mb-1 text-zinc-500">Max RPM</dt>
          <dd className="font-mono text-zinc-100">{formatNumber(summary.maxRpm)}</dd>
        </div>
        <div>
          <dt className="mb-1 text-zinc-500">Min RPM</dt>
          <dd className="font-mono text-zinc-100">{formatNumber(summary.minRpm)}</dd>
        </div>
        <div>
          <dt className="mb-1 text-zinc-500">Max speed</dt>
          <dd className="font-mono text-zinc-100">{formatNumber(summary.maxSpeedKmh, 1)} km/h</dd>
        </div>
        <div>
          <dt className="mb-1 text-zinc-500">Avg speed</dt>
          <dd className="font-mono text-zinc-100">{formatNumber(summary.avgSpeedKmh, 1)} km/h</dd>
        </div>
      </dl>

      {summary.laps.some((lap) => lap.speedTrace.length > 1) && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-medium text-zinc-400">Speed by distance into lap</h3>
          <SpeedDistanceChart laps={summary.laps} />
        </div>
      )}

      {summary.laps.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-blue-400 hover:text-blue-300">
            Lap breakdown ({summary.laps.length} laps)
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-zinc-500">
                  <th className="pb-2 pr-4">Lap</th>
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Max RPM</th>
                  <th className="pb-2 pr-4">Min RPM</th>
                  <th className="pb-2">Max speed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-zinc-200">
                {summary.laps.map((lap) => (
                  <tr key={lap.lap}>
                    <td className="py-1.5 pr-4">{lap.lap}</td>
                    <td className="py-1.5 pr-4">{lap.lapTime ?? "—"}</td>
                    <td className="py-1.5 pr-4">{formatNumber(lap.maxRpm)}</td>
                    <td className="py-1.5 pr-4">{formatNumber(lap.minRpm)}</td>
                    <td className="py-1.5">{formatNumber(lap.maxSpeedKmh, 1)} km/h</td>
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
