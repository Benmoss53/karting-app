"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BUCKET_BY_TYPE: Record<string, string> = {
  mychron: "telemetry",
  video: "videos",
  other: "telemetry",
};

export default function UploadForm({
  sessionId,
  driverId,
}: {
  sessionId: string;
  driverId: string;
}) {
  const [fileType, setFileType] = useState("mychron");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) {
      setError("Choose a file first.");
      return;
    }

    setIsUploading(true);
    const supabase = createClient();
    const bucket = BUCKET_BY_TYPE[fileType];
    const storagePath = `${driverId}/${sessionId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setIsUploading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("telemetry_files")
      .insert({
        session_id: sessionId,
        file_type: fileType,
        storage_path: storagePath,
        file_name: file.name,
      });

    setIsUploading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded border border-zinc-200 p-4">
      <h2 className="mb-3 text-sm font-medium text-zinc-600">Upload a file</h2>

      {error && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="file" className="mb-1 block text-sm font-medium">
            File
          </label>
          <input id="file" name="file" type="file" required className="w-full text-sm" />
        </div>
        <div>
          <label htmlFor="fileType" className="mb-1 block text-sm font-medium">
            Type
          </label>
          <select
            id="fileType"
            name="fileType"
            value={fileType}
            onChange={(event) => setFileType(event.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="mychron">MyChron data</option>
            <option value="video">SmartyCam video</option>
            <option value="other">Other</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isUploading}
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </form>
  );
}
