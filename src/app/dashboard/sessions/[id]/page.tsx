import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UploadForm from "@/components/upload-form";

const SETUP_FIELDS: { label: string; key: string }[] = [
  { label: "Front track", key: "front_track" },
  { label: "Rear track", key: "rear_track" },
  { label: "Caster", key: "caster" },
  { label: "Camber", key: "camber" },
  { label: "Toe", key: "toe" },
  { label: "Seat position", key: "seat_position" },
  { label: "Front crash bar", key: "front_crash_bar" },
  { label: "Rear crash bar", key: "rear_crash_bar" },
  { label: "Axle grade", key: "axle_grade" },
  { label: "Seat grade", key: "seat_grade" },
  { label: "Axle length", key: "axle_length" },
  { label: "Seat stays", key: "seat_stays" },
];

const PILL_KEYS = new Set([
  "front_crash_bar",
  "rear_crash_bar",
  "seat_stays",
]);

const PILL_STYLES: Record<string, string> = {
  tight: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
  on: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
  loose: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
  off: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
};

const FILE_TYPE_BADGE: Record<string, string> = {
  mychron: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
  video: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
  other: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-500/20",
};

function SetupValue({ fieldKey, value }: { fieldKey: string; value: string | null }) {
  if (!value) return <dd className="text-zinc-400">—</dd>;

  if (PILL_KEYS.has(fieldKey)) {
    return (
      <dd>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            PILL_STYLES[value] ?? "bg-zinc-100 text-zinc-700"
          }`}
        >
          {value}
        </span>
      </dd>
    );
  }

  return <dd className="text-zinc-900">{value}</dd>;
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, track_name, session_date, setup_notes")
    .eq("id", id)
    .single();

  if (!session || !user) {
    notFound();
  }

  const { data: files } = await supabase
    .from("telemetry_files")
    .select("id, file_name, file_type, uploaded_at")
    .eq("session_id", id)
    .order("uploaded_at", { ascending: false });

  const { data: setupSheet } = await supabase
    .from("setup_sheets")
    .select("*")
    .eq("session_id", id)
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        {session.track_name}
      </h1>
      <p className="mb-8 text-sm text-zinc-500">{session.session_date}</p>

      {session.setup_notes && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-zinc-500">Setup notes</h2>
          <p className="whitespace-pre-wrap text-zinc-900">{session.setup_notes}</p>
        </div>
      )}

      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-500">Setup sheet</h2>
          <Link
            href={`/dashboard/sessions/${session.id}/setup`}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {setupSheet ? "Edit" : "Add setup sheet"}
          </Link>
        </div>

        {setupSheet ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
            {SETUP_FIELDS.map(({ label, key }) => (
              <div key={key}>
                <dt className="mb-1 text-zinc-500">{label}</dt>
                <SetupValue fieldKey={key} value={setupSheet[key]} />
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">No setup sheet yet for this session.</p>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-zinc-500">Files</h2>
        {!files || files.length === 0 ? (
          <p className="text-sm text-zinc-500">No files uploaded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100">
            {files.map((file) => (
              <li key={file.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-zinc-900">{file.file_name}</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                    FILE_TYPE_BADGE[file.file_type] ?? FILE_TYPE_BADGE.other
                  }`}
                >
                  {file.file_type}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <UploadForm sessionId={session.id} driverId={user.id} />
    </div>
  );
}
