import Link from "next/link";
import TrackIcon from "@/components/track-icon";
import type { SessionOverview } from "@/lib/session-overview";

export const DAY_TYPE_LABEL: Record<string, string> = {
  race_meeting: "Race Day",
  practice: "Practice Session",
  test_day: "Test Session",
  other: "Other",
};

export function dayTypeLabel(dayType: string | null) {
  return dayType ? (DAY_TYPE_LABEL[dayType] ?? dayType) : "Practice Session";
}

function formatSessionDate(dateStr: string, timeStr: string | null) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateStr}T00:00:00`));

  if (!timeStr) return date;

  const [hours, minutes] = timeStr.split(":").map(Number);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2000, 0, 1, hours, minutes));

  return `${date} • ${time}`;
}

export default function SessionCard({
  session,
  highlighted = false,
}: {
  session: SessionOverview;
  highlighted?: boolean;
}) {
  return (
    <Link
      href={`/dashboard/sessions/${session.id}`}
      className={`group flex items-center gap-4 rounded-2xl border bg-neutral-900 p-4 shadow-sm transition-colors hover:border-red-600/50 ${
        highlighted ? "border-neutral-800 border-l-4 border-l-red-600" : "border-neutral-800"
      }`}
    >
      <TrackIcon seed={session.track_name} className="h-10 w-10 shrink-0 text-neutral-600" />

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{session.track_name}</p>
        <p className="text-sm text-neutral-500">{dayTypeLabel(session.day_type)}</p>
        <p className="mt-0.5 font-mono text-xs text-neutral-600">
          {formatSessionDate(session.session_date, session.session_time)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {session.bestLap && (
          <div className="text-right">
            <p className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
              Best lap
            </p>
            <p className="mt-1 font-mono text-base font-semibold text-white">{session.bestLap}</p>
          </div>
        )}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}
