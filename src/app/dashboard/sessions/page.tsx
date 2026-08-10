import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SessionFilterList from "@/components/session-filter-list";
import { loadSessionsOverview } from "@/lib/session-overview";

export default async function SessionsPage() {
  const supabase = await createClient();
  const sessions = await loadSessionsOverview(supabase);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Sessions</h1>
          <p className="mt-1 text-sm text-neutral-400">Every test and race day you&apos;ve logged.</p>
        </div>
      </div>

      <Link
        href="/dashboard/new"
        className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-red-700 active:scale-[0.99]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Session
      </Link>

      <SessionFilterList sessions={sessions} />
    </div>
  );
}
