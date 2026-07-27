"use client";

import type { FormEvent } from "react";
import { deleteTelemetryFile } from "@/app/dashboard/sessions/[id]/actions";

export default function DeleteFileButton({
  sessionId,
  fileId,
  fileName,
}: {
  sessionId: string;
  fileId: string;
  fileName: string;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(`Delete "${fileName}"? This can't be undone.`);
    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form action={deleteTelemetryFile} onSubmit={handleSubmit}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="fileId" value={fileId} />
      <button
        type="submit"
        className="text-sm font-medium text-slate-500 transition-colors hover:text-rose-600"
      >
        Delete
      </button>
    </form>
  );
}
