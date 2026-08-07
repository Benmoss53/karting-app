import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthedUser } from "@/lib/supabase/user";
import SessionCard from "@/components/session-card";
import StatTile from "@/components/stat-tile";
import { loadSessionsOverview, computeDashboardStats } from "@/lib/session-overview";

const RECENT_SESSIONS_LIMIT = 3;

function greetingForHour(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function SessionsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function TrackIconStat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden>
      <path d="M4 20c0-6 3-10 8-10s6-6 12-6" />
    </svg>
  );
}

function StopwatchIconStat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13l3-3M9 2h6" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4L12 2z" />
    </svg>
  );
}

function AnalysisIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}

const QUICK_ACTIONS = [
  { href: "/dashboard/new", label: "Add Session", Icon: PlusIcon },
  { href: "/dashboard/assistant", label: "AI Assistant", Icon: SparkleIcon },
  { href: "/dashboard/analysis", label: "Analysis", Icon: AnalysisIcon },
  { href: "/dashboard/tracks", label: "Track Guide", Icon: TrackIconStat },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getAuthedUser();

  const [{ data: driver }, sessions] = await Promise.all([
    user ? supabase.from("drivers").select("full_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    loadSessionsOverview(supabase),
  ]);

  const firstName = driver?.full_name?.trim().split(" ")[0] || user?.email?.split("@")[0] || "there";
  const greeting = greetingForHour(new Date().getHours());
  const stats = computeDashboardStats(sessions);
  const recentSessions = sessions.slice(0, RECENT_SESSIONS_LIMIT);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">
        {greeting}, {firstName} <span aria-hidden>👋</span>
      </h1>
      <p className="mt-1 text-sm text-neutral-400">Here&apos;s your karting overview.</p>

      <div className="mt-6 flex gap-3">
        <StatTile
          icon={<SessionsIcon className="h-4 w-4" />}
          value={String(stats.sessionsThisMonth)}
          label="Sessions"
          sublabel="This month"
        />
        <StatTile
          icon={<TrackIconStat className="h-4 w-4" />}
          value={String(stats.tracksVisited)}
          label="Tracks"
          sublabel="Visited"
        />
        <StatTile
          icon={<StopwatchIconStat className="h-4 w-4" />}
          value={stats.bestLapOverall ?? "—"}
          label="Best Lap"
          sublabel="Overall"
        />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-widest text-neutral-300">RECENT SESSIONS</h2>
          {sessions.length > RECENT_SESSIONS_LIMIT && (
            <Link href="/dashboard/sessions" className="text-xs font-medium text-red-500 hover:text-red-400">
              View all
            </Link>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900 px-6 py-16 text-center">
            <p className="text-neutral-500">No days logged yet. Add one to start uploading telemetry.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentSessions.map((session, index) => (
              <SessionCard key={session.id} session={session} highlighted={index === 0} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-neutral-300">QUICK ACTIONS</h2>
        <div className="grid grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-2 py-4 text-center transition-colors hover:border-red-600/50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600/10 text-red-500">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-medium leading-tight text-neutral-300">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
