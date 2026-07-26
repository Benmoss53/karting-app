import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UploadForm from "@/components/upload-form";

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
