import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitSetupEntry, saveSetupFeedback } from "../actions";
import { SETUP_SHEET_FIELDS } from "@/lib/setup-sheet";
import SetupEntryLog from "@/components/setup-entry-log";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-300";
const cardClass =
  "rounded-xl border border-white/10 bg-zinc-900/60 p-6 shadow-lg shadow-black/20 backdrop-blur-sm";

type Entry = Record<string, unknown> & { id: string; session_id: string; created_at: string };

export default async function SetupSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, track_name, session_date")
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  // Every change logged for this specific day, oldest first.
  const { data: todayEntries } = await supabase
    .from("setup_sheets")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  // Every other day's changes, grouped by session, most recent day first.
  let priorDays: {
    session: { track_name: string; session_date: string };
    entries: Entry[];
  }[] = [];
  if (user) {
    const { data: priorSessions } = await supabase
      .from("sessions")
      .select("id, track_name, session_date")
      .eq("driver_id", user.id)
      .lt("session_date", session.session_date)
      .order("session_date", { ascending: false });

    const priorIds = (priorSessions ?? []).map((s) => s.id);
    const { data: priorEntryRows } = priorIds.length
      ? await supabase
          .from("setup_sheets")
          .select("*")
          .in("session_id", priorIds)
          .order("created_at", { ascending: true })
      : { data: [] };

    const entriesBySession = new Map<string, Entry[]>();
    for (const row of (priorEntryRows ?? []) as Entry[]) {
      const list = entriesBySession.get(row.session_id) ?? [];
      list.push(row);
      entriesBySession.set(row.session_id, list);
    }

    priorDays = (priorSessions ?? []).map((s) => ({
      session: { track_name: s.track_name, session_date: s.session_date },
      entries: entriesBySession.get(s.id) ?? [],
    }));
  }

  // The single most recent change across every day (today included) — the
  // base the next change works from, and the gate on submitting a new one.
  const allEntries = [...((todayEntries ?? []) as Entry[]), ...priorDays.flatMap((d) => d.entries)].sort(
    (a, b) => b.created_at.localeCompare(a.created_at),
  );
  const latestEntry = allEntries[0] ?? null;
  const pendingEntry = latestEntry && !latestEntry.feedback ? latestEntry : null;
  const pendingIsToday = pendingEntry ? pendingEntry.session_id === id : false;

  let pendingSessionLabel: { track_name: string; session_date: string } | null = null;
  if (pendingEntry && !pendingIsToday) {
    const { data: pendingSession } = await supabase
      .from("sessions")
      .select("track_name, session_date")
      .eq("id", pendingEntry.session_id)
      .maybeSingle();
    pendingSessionLabel = pendingSession;
  }

  return (
    <div className="max-w-5xl">
      <Link
        href={`/dashboard/sessions/${id}`}
        className="mb-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
      >
        ← {session.track_name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Setup sheet</h1>
      <p className="mb-6 text-sm text-zinc-500">{session.track_name}</p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {error && (
            <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-400/20">
              {error}
            </p>
          )}

          {pendingEntry ? (
            <div className={cardClass}>
              <h2 className="mb-1 text-sm font-medium text-zinc-400">Log what that change did</h2>
              {!pendingIsToday && pendingSessionLabel && (
                <p className="mb-3 text-xs text-zinc-500">
                  From {pendingSessionLabel.track_name} on {pendingSessionLabel.session_date} — you
                  need to log this before submitting a new change.
                </p>
              )}
              <form action={saveSetupFeedback} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="sessionId" value={id} />
                <input type="hidden" name="entryId" value={pendingEntry.id} />
                <label htmlFor="feedback" className={labelClass}>
                  How did the kart feel?
                </label>
                <textarea
                  id="feedback"
                  name="feedback"
                  rows={3}
                  placeholder="e.g. Gave more steer into the corner but felt loose on exit"
                  className={inputClass}
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center self-start rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(239,68,68,0.5)] transition-all duration-200 hover:scale-[1.02] hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-zinc-900 active:scale-[0.98]"
                >
                  Save feedback
                </button>
              </form>
            </div>
          ) : (
            <>
              {latestEntry && (
                <p className="mb-4 rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-300 ring-1 ring-inset ring-blue-400/20">
                  Starting from your last logged setup — adjust what changed and submit.
                </p>
              )}

              <form action={submitSetupEntry} className="flex flex-col gap-6">
                <input type="hidden" name="sessionId" value={session.id} />

                <div className={cardClass}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {SETUP_SHEET_FIELDS.filter(
                      ({ key }) => key !== "seat_position_a" && key !== "seat_position_b",
                    ).map(({ label, name, key }) => (
                      <Field
                        key={key}
                        label={label}
                        name={name}
                        defaultValue={latestEntry?.[key] as string | null | undefined}
                      />
                    ))}
                  </div>
                </div>

                <div className={cardClass}>
                  <h2 className="mb-4 text-sm font-medium text-zinc-400">Seat position</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="seatPositionA" className={labelClass}>
                        A
                      </label>
                      <p className="mb-1.5 text-xs text-zinc-500">
                        Distance above/below bottom of chassis rail
                      </p>
                      <input
                        id="seatPositionA"
                        name="seatPositionA"
                        type="text"
                        defaultValue={(latestEntry?.seat_position_a as string) ?? ""}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="seatPositionB" className={labelClass}>
                        B
                      </label>
                      <p className="mb-1.5 text-xs text-zinc-500">
                        Measured at 45° angle from axle to seat back
                      </p>
                      <input
                        id="seatPositionB"
                        name="seatPositionB"
                        type="text"
                        defaultValue={(latestEntry?.seat_position_b as string) ?? ""}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(37,99,235,0.7)] transition-all duration-200 hover:scale-[1.02] hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 active:scale-[0.98]"
                >
                  Submit setup
                </button>
              </form>
            </>
          )}

          <div className={`mt-6 ${cardClass}`}>
            <h2 className="mb-3 text-sm font-medium text-zinc-400">This day&apos;s log</h2>
            <SetupEntryLog entries={(todayEntries ?? []) as Entry[]} />
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Previous days</h2>
          {priorDays.length === 0 ? (
            <p className="text-sm text-zinc-500">No previous days logged yet.</p>
          ) : (
            <ul className="flex max-h-[calc(100vh-8rem)] flex-col gap-3 overflow-y-auto pr-1">
              {priorDays.map(({ session: priorSession, entries }, index) => (
                <li
                  key={`${priorSession.session_date}-${index}`}
                  className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 shadow-lg shadow-black/20 backdrop-blur-sm"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-medium text-zinc-100">{priorSession.track_name}</span>
                    <span className="font-mono text-xs text-zinc-500">
                      {priorSession.session_date}
                    </span>
                  </div>
                  <SetupEntryLog entries={entries} compact />
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <input id={name} name={name} type="text" defaultValue={defaultValue ?? ""} className={inputClass} />
    </div>
  );
}
