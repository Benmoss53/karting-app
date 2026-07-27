"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BUCKET_BY_TYPE } from "@/lib/storage";

export default function UploadForm({
  sessionId,
  driverId,
  allowedTypes,
  label = "Upload a file",
}: {
  sessionId: string;
  driverId: string;
  allowedTypes: { value: string; label: string }[];
  label?: string;
}) {
  const [fileType, setFileType] = useState(allowedTypes[0].value);
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
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-4 text-sm font-medium text-slate-500">{label}</h2>

      {error && (
        <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="file" className="mb-1.5 block text-sm font-medium text-slate-700">
            File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-200"
          />
        </div>
        {allowedTypes.length > 1 && (
          <div>
            <label htmlFor="fileType" className="mb-1.5 block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              id="fileType"
              name="fileType"
              value={fileType}
              onChange={(event) => setFileType(event.target.value)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {allowedTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </form>
  );
}
