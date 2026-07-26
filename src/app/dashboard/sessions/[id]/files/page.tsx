import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_BY_TYPE } from "@/lib/storage";
import UploadForm from "@/components/upload-form";

const FILE_TYPE_BADGE: Record<string, string> = {
  mychron: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
  video: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
  other: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-500/20",
};

export default async function FilesPage({
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
    .order("uploaded_at", { ascending: false });

  const filesWithLinks = await Promise.all(
    (files ?? []).map(async (file) => {
      const bucket = BUCKET_BY_TYPE[file.file_type] ?? "telemetry";
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(file.storage_path, 3600);
      return { ...file, downloadUrl: signed?.signedUrl ?? null };
    }),
  );

  return (
    <div className="max-w-2xl">
      <Link
        href={`/dashboard/sessions/${id}`}
        className="mb-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← {session.track_name}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900">
        Download MyChron Data
      </h1>

      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {filesWithLinks.length === 0 ? (
          <p className="text-sm text-zinc-500">No files uploaded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100">
            {filesWithLinks.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-900">{file.file_name}</span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                      FILE_TYPE_BADGE[file.file_type] ?? FILE_TYPE_BADGE.other
                    }`}
                  >
                    {file.file_type}
                  </span>
                </div>
                {file.downloadUrl ? (
                  <a
                    href={file.downloadUrl}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-sm text-zinc-400">Unavailable</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <UploadForm sessionId={session.id} driverId={user.id} />
    </div>
  );
}
