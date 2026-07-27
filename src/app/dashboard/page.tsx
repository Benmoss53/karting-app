import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AiCoachChat from "@/components/ai-coach-chat";

const DAY_TYPE_LABEL: Record<string, string> = {
  race_meeting: "Race meeting",
  test_day: "Test day",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: sessions }, { count: coachCount }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, track_name, session_date, day_type")
      .order("session_date", { ascending: false }),
    supabase.from("coach_entries").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 via-zinc-900/60 to-red-500/10 p-6 shadow-xl shadow-black/30 sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
          Speak To Your AI Coach
        </h1>
        <p className="mt-2 mb-6 text-base text-zinc-400">
          Ask about setup changes across every day you&apos;ve logged — setup sheets, weather,
          and testing history all feed into the answer.
        </p>
        <AiCoachChat entryCount={coachCount ?? 0} />
      </div>

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Your test / race days
        </h1>
        <Link
          href="/dashboard/new"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(37,99,235,0.7)] transition-all duration-200 hover:scale-[1.02] hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black active:scale-[0.98]"
        >
          Add a day
        </Link>
      </div>

      {!sessions || sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-zinc-900/40 px-6 py-16 text-center">
          <p className="text-zinc-400">
            No days logged yet. Add one to start uploading telemetry.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/dashboard/sessions/${session.id}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/60 px-5 py-4 shadow-lg shadow-black/20 backdrop-blur-sm transition-all duration-200 hover:scale-[1.01] hover:border-blue-400/40 hover:shadow-blue-500/10"
              >
                <span className="flex items-center gap-3">
                  <span className="font-medium text-zinc-50">{session.track_name}</span>
                  {session.day_type && (
                    <span className="inline-flex rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-zinc-300 ring-1 ring-inset ring-white/10">
                      {DAY_TYPE_LABEL[session.day_type] ?? session.day_type}
                    </span>
                  )}
                </span>
                <span className="font-mono text-sm text-zinc-400">{session.session_date}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
