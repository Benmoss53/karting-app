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
  mychron: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  other: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
};

function formatNumber(value: number | null | undefined, digits = 0) {
  return value == null ? "—" : value.toFixed(digits);
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
        className="mb-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← {session.track_name}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">
        Upload MyChron Data
      </h1>

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {filesWithLinks.length === 0 ? (
          <p className="text-sm text-slate-500">No files uploaded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-200">
            {filesWithLinks.map((file) => (
              <li key={file.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-900">{file.file_name}</span>
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
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-sm text-slate-500">Unavailable</span>
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
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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

      <p className="mb-6 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 ring-1 ring-inset ring-blue-200">
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
          <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
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
