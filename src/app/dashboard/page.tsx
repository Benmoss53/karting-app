import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AiCoachChat from "@/components/ai-coach-chat";
import SessionCard from "@/components/session-card";
import { loadSessionsOverview } from "@/lib/session-overview";

function greetingForHour(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: driver }, { count: feedbackCount }, sessions] = await Promise.all([
    user ? supabase.from("drivers").select("full_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from("setup_sheets")
      .select("id", { count: "exact", head: true })
      .not("feedback", "is", null),
    loadSessionsOverview(supabase),
  ]);

  const firstName = driver?.full_name?.trim().split(" ")[0] || user?.email?.split("@")[0] || "there";
  const greeting = greetingForHour(new Date().getHours());

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          {greeting}, {firstName} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Your karting data. Smarter insights. Faster laps.
        </p>

        <div className="mt-8">
          <h2 className="text-xs font-semibold tracking-widest text-neutral-300">SESSIONS</h2>
          <span className="mt-1.5 block h-1 w-8 rounded-full bg-red-600" />

          <div className="mt-4 flex flex-col gap-3">
            {sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900 px-6 py-16 text-center">
                <p className="text-neutral-500">
                  No days logged yet. Add one to start uploading telemetry.
                </p>
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
      </div>

      <div className="lg:w-[380px] lg:shrink-0">
        <AiCoachChat entryCount={feedbackCount ?? 0} />
      </div>
    </div>
  );
}
