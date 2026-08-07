"use client";

import { useMemo, useState } from "react";
import SessionCard from "@/components/session-card";
import type { SessionOverview } from "@/lib/session-overview";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "race_meeting", label: "Race" },
  { value: "practice", label: "Practice" },
  { value: "test_day", label: "Test" },
] as const;

function monthLabel(dateStr: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" })
    .format(new Date(`${dateStr}T00:00:00`))
    .toUpperCase();
}

export default function SessionFilterList({ sessions }: { sessions: SessionOverview[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => {
      if (filter !== "all" && s.day_type !== filter) return false;
      if (q && !s.track_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sessions, query, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, SessionOverview[]>();
    for (const session of filtered) {
      const key = monthLabel(session.session_date);
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div>
      <div className="relative mb-4">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sessions"
          className="w-full rounded-xl border border-neutral-700 bg-neutral-800/80 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-neutral-500 shadow-sm transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === value
                ? "bg-red-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900 px-6 py-16 text-center">
          <p className="text-neutral-500">No sessions match that search.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([month, monthSessions]) => (
            <div key={month}>
              <h2 className="mb-3 text-xs font-semibold tracking-widest text-neutral-500">{month}</h2>
              <div className="flex flex-col gap-3">
                {monthSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
