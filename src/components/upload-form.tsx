"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BUCKET_BY_TYPE } from "@/lib/storage";
import { cardClass, inputClass, labelClass, primaryButtonClass, errorBannerClass } from "@/lib/dark-ui";

export default function UploadForm({
  sessionId,
  runId,
  driverId,
  allowedTypes,
  label = "Upload a file",
}: {
  sessionId: string;
  runId: string;
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
        run_id: runId,
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
    <form onSubmit={handleSubmit} className={cardClass}>
      <h2 className="mb-4 text-sm font-medium text-neutral-400">{label}</h2>

      {error && <p className={`mb-3 ${errorBannerClass}`}>{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="file" className={labelClass}>
            File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            className="w-full text-sm text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-red-600/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-red-400 hover:file:bg-red-600/20"
          />
        </div>
        {allowedTypes.length > 1 && (
          <div>
            <label htmlFor="fileType" className={labelClass}>
              Type
            </label>
            <select
              id="fileType"
              name="fileType"
              value={fileType}
              onChange={(event) => setFileType(event.target.value)}
              className={inputClass}
            >
              {allowedTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" disabled={isUploading} className={primaryButtonClass}>
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </form>
  );
}
