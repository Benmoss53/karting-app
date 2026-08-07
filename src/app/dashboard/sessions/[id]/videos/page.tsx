import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_BY_TYPE } from "@/lib/storage";
import UploadForm from "@/components/upload-form";

export default async function VideoLibraryPage({
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
    .select("id, file_name, storage_path, uploaded_at")
    .eq("session_id", id)
    .eq("file_type", "video")
    .order("uploaded_at", { ascending: false });

  const filesWithLinks = await Promise.all(
    (files ?? []).map(async (file) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET_BY_TYPE.video)
        .createSignedUrl(file.storage_path, 3600);
      return { ...file, downloadUrl: signed?.signedUrl ?? null };
    }),
  );

  return (
    <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <Link
        href={`/dashboard/sessions/${id}`}
        className="mb-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← {session.track_name}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">
        Video Library
      </h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {filesWithLinks.length === 0 ? (
          <p className="text-sm text-slate-500">No footage uploaded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-200">
            {filesWithLinks.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <span className="text-slate-900">{file.file_name}</span>
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
              </li>
            ))}
          </ul>
        )}
      </div>

      <UploadForm
        sessionId={session.id}
        driverId={user.id}
        allowedTypes={[{ value: "video", label: "SmartyCam video" }]}
        label="Upload footage"
      />
    </div>
  );
}
