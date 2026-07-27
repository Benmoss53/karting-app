import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AiCoachChat from "@/components/ai-coach-chat";
import SetupEntryLog from "@/components/setup-entry-log";
import { SETUP_SHEET_FIELDS } from "@/lib/setup-sheet";

const DAY_TYPE_LABEL: Record<string, string> = {
  race_meeting: "Race meeting",
  test_day: "Test day",
};

type Entry = Record<string, unknown> & { id: string; session_id: string };

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: sessions }, { count: feedbackCount }, { data: setupEntries }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, track_name, session_date, day_type")
      .order("session_date", { ascending: false }),
    supabase
      .from("setup_sheets")
      .select("id", { count: "exact", head: true })
      .not("feedback", "is", null),
    supabase.from("setup_sheets").select("*").order("created_at", { ascending: true }),
  ]);

  const entriesBySession = new Map<string, Entry[]>();
  for (const row of (setupEntries ?? []) as Entry[]) {
    const list = entriesBySession.get(row.session_id) ?? [];
    list.push(row);
    entriesBySession.set(row.session_id, list);
  }

  // Number sessions chronologically (Session 1 = earliest), independent of
  // the newest-first display order below.
  const chronological = [...(sessions ?? [])].sort((a, b) =>
    a.session_date.localeCompare(b.session_date),
  );
  const sessionNumber = new Map(chronological.map((s, index) => [s.id, index + 1]));

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Speak To Your AI Coach
        </h1>
        <p className="mt-2 mb-6 text-base text-slate-600">
          Ask about setup changes across every day you&apos;ve logged — setup sheets, weather,
          and how the kart felt all feed into the answer.
        </p>
        <AiCoachChat entryCount={feedbackCount ?? 0} />
      </div>

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Your test / race days
        </h1>
        <Link
          href="/dashboard/new"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white active:scale-[0.98]"
        >
          Add a day
        </Link>
      </div>

      {!sessions || sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-slate-500">
            No days logged yet. Add one to start uploading telemetry.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((session) => {
            const entries = entriesBySession.get(session.id) ?? [];
            const latestEntry = entries[entries.length - 1];
            const filledFields = SETUP_SHEET_FIELDS.filter(({ key }) => latestEntry?.[key]);

            return (
              <li key={session.id}>
                <details className="group rounded-xl border border-slate-200 bg-white shadow-sm open:border-blue-300">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="inline-block text-slate-400 transition-transform duration-200 group-open:rotate-90"
                      >
                        ▸
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        Session {sessionNumber.get(session.id)}
                      </span>
                      <span className="font-medium text-slate-900">{session.track_name}</span>
                      {session.day_type && (
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                          {DAY_TYPE_LABEL[session.day_type] ?? session.day_type}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-sm text-slate-500">{session.session_date}</span>
                  </summary>

                  <div className="border-t border-slate-200 px-5 py-4">
                    {latestEntry ? (
                      <>
                        {filledFields.length > 0 && (
                          <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                            {filledFields.map(({ label, key }) => (
                              <div key={key}>
                                <dt className="text-xs text-slate-400">{label}</dt>
                                <dd className="font-mono text-slate-700">
                                  {latestEntry[key] as string}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        <SetupEntryLog entries={entries} compact />
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">No setup sheet saved for this day yet.</p>
                    )}
                    <Link
                      href={`/dashboard/sessions/${session.id}`}
                      className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Open day →
                    </Link>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
