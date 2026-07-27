"use client";

import type { FormEvent } from "react";
import { deleteSession } from "@/app/dashboard/sessions/[id]/actions";

export default function DeleteSessionButton({
  sessionId,
  trackName,
}: {
  sessionId: string;
  trackName: string;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `Delete "${trackName}"? This removes its setup sheet, weather, testing setups, and all uploaded files. This can't be undone.`,
    );
    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form action={deleteSession} onSubmit={handleSubmit}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <button
        type="submit"
        className="text-sm font-medium text-zinc-500 transition-colors hover:text-red-400"
      >
        Delete this day
      </button>
    </form>
  );
}
