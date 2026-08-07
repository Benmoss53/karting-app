import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SessionCard from "@/components/session-card";
import { loadSessionsOverview } from "@/lib/session-overview";

export default async function SessionsPage() {
  const supabase = await createClient();
  const sessions = await loadSessionsOverview(supabase);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Sessions</h1>
      <p className="mt-1 text-sm text-neutral-400">Every test and race day you&apos;ve logged.</p>

      <div className="mt-6 flex flex-col gap-3">
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900 px-6 py-16 text-center">
            <p className="text-neutral-500">No days logged yet. Add one to start uploading telemetry.</p>
          </div>
        ) : (
          sessions.map((session, index) => (
            <SessionCard key={session.id} session={session} highlighted={index === 0} />
          ))
        )}

        <Link
          href="/dashboard/new"
          className="flex items-center gap-4 rounded-2xl border border-dashed border-red-600/50 p-4 text-red-500 transition-colors hover:bg-red-600/5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-600/50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <div>
            <p className="font-semibold">Add Session</p>
            <p className="text-sm text-red-500/70">Log a new session</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
