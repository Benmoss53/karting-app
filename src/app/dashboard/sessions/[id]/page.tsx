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
      <h1 className="text-2xl font-semibold">{session.track_name}</h1>
      <p className="mb-6 text-sm text-zinc-600">{session.session_date}</p>

      {session.setup_notes && (
        <div className="mb-8 rounded border border-zinc-200 p-4">
          <h2 className="mb-2 text-sm font-medium text-zinc-600">Setup notes</h2>
          <p className="whitespace-pre-wrap">{session.setup_notes}</p>
        </div>
      )}

      <div className="mb-8 rounded border border-zinc-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-600">Setup sheet</h2>
          <Link href={`/dashboard/sessions/${session.id}/setup`} className="text-sm underline">
            {setupSheet ? "Edit" : "Add setup sheet"}
          </Link>
        </div>

        {setupSheet ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {SETUP_FIELDS.map(({ label, key }) => (
              <div key={key}>
                <dt className="text-zinc-500">{label}</dt>
                <dd>{setupSheet[key] ?? "—"}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-zinc-600">No setup sheet yet for this session.</p>
        )}
      </div>

      <h2 className="mb-2 text-sm font-medium text-zinc-600">Files</h2>
      <ul className="mb-6 divide-y divide-zinc-200 rounded border border-zinc-200">
        {!files || files.length === 0 ? (
          <li className="px-4 py-3 text-sm text-zinc-600">No files uploaded yet.</li>
        ) : (
          files.map((file) => (
            <li key={file.id} className="flex items-center justify-between px-4 py-3">
              <span>{file.file_name}</span>
              <span className="text-xs uppercase text-zinc-500">{file.file_type}</span>
            </li>
          ))
        )}
      </ul>

      <UploadForm sessionId={session.id} driverId={user.id} />
    </div>
  );
}
