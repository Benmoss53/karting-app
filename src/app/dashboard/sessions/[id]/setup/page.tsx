import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthedUser } from "@/lib/supabase/user";
import { submitSetupEntry, updateSetupEntry, saveSetupFeedback } from "../actions";
import { SETUP_SHEET_FIELDS, SETUP_SHEET_GROUPS } from "@/lib/setup-sheet";
import { loadSessionsOverview } from "@/lib/session-overview";
import SetupEntryLog from "@/components/setup-entry-log";
import KartDiagram from "@/components/kart-diagram";
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  errorBannerClass,
  infoBannerClass,
  backLinkClass,
  pillClass,
} from "@/lib/dark-ui";

const DAY_TYPE_LABEL: Record<string, string> = {
  race_meeting: "Race day",
  test_day: "Test day",
};

const FIELD_BY_KEY = new Map(SETUP_SHEET_FIELDS.map((f) => [f.key, f]));

type Entry = Record<string, unknown> & { id: string; session_id: string; created_at: string };
type WeatherRow = {
  session_id: string;
  sky_conditions: string | null;
  temperature: string | null;
  track_temp: string | null;
};

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
  const user = await getAuthedUser();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, track_name, session_date, day_type, setup_notes")
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
    session: { id: string; track_name: string; session_date: string; day_type: string | null };
    entries: Entry[];
  }[] = [];
  if (user) {
    const { data: priorSessions } = await supabase
      .from("sessions")
      .select("id, track_name, session_date, day_type")
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
      session: { id: s.id, track_name: s.track_name, session_date: s.session_date, day_type: s.day_type },
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

  // Track conditions + best lap for the header sidebar and the history
  // table both draw from real data already tracked elsewhere in the app —
  // no new schema, just reused here.
  const historySessionIds = [id, ...priorDays.map((d) => d.session.id)];
  const [{ data: weatherRows }, sessionsOverview] = await Promise.all([
    supabase
      .from("weather_conditions")
      .select("session_id, sky_conditions, temperature, track_temp")
      .in("session_id", historySessionIds),
    loadSessionsOverview(supabase),
  ]);

  const weatherBySessionId = new Map(
    ((weatherRows ?? []) as WeatherRow[]).map((row) => [row.session_id, row]),
  );
  const bestLapBySessionId = new Map(sessionsOverview.map((s) => [s.id, s.bestLap]));

  const todayWeather = weatherBySessionId.get(id) ?? null;
  const todayBestLap = bestLapBySessionId.get(id) ?? null;

  const historyRows = [
    { id: session.id, track_name: session.track_name, session_date: session.session_date, day_type: session.day_type },
    ...priorDays.map((d) => d.session),
  ];

  const values = pendingEntry ?? latestEntry;

  return (
    <div className="max-w-6xl">
      <Link href={`/dashboard/sessions/${id}`} className={backLinkClass}>
        ← {session.track_name}
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Setup sheet</h1>
        {session.day_type && (
          <span className={pillClass}>{DAY_TYPE_LABEL[session.day_type] ?? session.day_type}</span>
        )}
      </div>
      <p className="mb-6 -mt-4 text-sm text-neutral-400">
        {session.track_name} <span className="mx-1.5 text-neutral-700">·</span>{" "}
        <span className="font-mono">{session.session_date}</span>
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {error && <p className={errorBannerClass}>{error}</p>}

          <div className={cardClass}>
            <h2 className="mb-4 text-sm font-medium text-neutral-400">Kart diagram</h2>
            <KartDiagram values={values} />
          </div>

          {pendingEntry ? (
            <>
              <form action={updateSetupEntry} className="flex flex-col gap-4">
                <input type="hidden" name="sessionId" value={id} />
                <input type="hidden" name="entryId" value={pendingEntry.id} />
                <SpecFields values={pendingEntry} />
                <button type="submit" className={`self-start ${primaryButtonClass}`}>
                  Update setup
                </button>
              </form>

              <div className={cardClass}>
                <h2 className="mb-1 text-sm font-medium text-neutral-400">Log what that change did</h2>
                {!pendingIsToday && pendingSessionLabel && (
                  <p className="mb-3 text-xs text-neutral-500">
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
                  <button type="submit" className={`self-start ${primaryButtonClass}`}>
                    Save feedback
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              {latestEntry && (
                <p className={infoBannerClass}>
                  Starting from your last logged setup — adjust what changed and submit.
                </p>
              )}

              <form action={submitSetupEntry} className="flex flex-col gap-4">
                <input type="hidden" name="sessionId" value={session.id} />
                <SpecFields values={latestEntry} />
                <button type="submit" className={`self-start ${primaryButtonClass}`}>
                  Submit setup
                </button>
              </form>
            </>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <div className={cardClass}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Track conditions
            </h2>
            {todayWeather ? (
              <dl className="flex flex-col gap-2 text-sm">
                {todayWeather.temperature && (
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-400">Air temp</dt>
                    <dd className="font-mono text-neutral-100">{todayWeather.temperature}</dd>
                  </div>
                )}
                {todayWeather.track_temp && (
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-400">Track temp</dt>
                    <dd className="font-mono text-neutral-100">{todayWeather.track_temp}</dd>
                  </div>
                )}
                {todayWeather.sky_conditions && (
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-400">Weather</dt>
                    <dd className="capitalize text-neutral-100">{todayWeather.sky_conditions}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-neutral-500">No weather logged for this day.</p>
            )}
          </div>

          {session.setup_notes && (
            <div className={cardClass}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Notes
              </h2>
              <p className="whitespace-pre-wrap text-sm text-neutral-200">{session.setup_notes}</p>
            </div>
          )}

          <div className={cardClass}>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Best lap
            </h2>
            <p className="font-mono text-2xl font-semibold text-red-400">{todayBestLap ?? "—"}</p>
            <p className="mt-0.5 text-xs text-neutral-500">This day</p>
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Setup history
            </h2>
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[380px] text-left text-xs">
                <thead>
                  <tr className="text-neutral-500">
                    <th className="px-2 pb-2 font-medium">Date</th>
                    <th className="px-2 pb-2 font-medium">Track</th>
                    <th className="px-2 pb-2 font-medium">Type</th>
                    <th className="px-2 pb-2 font-medium">Best lap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {historyRows.map((row) => (
                    <tr key={row.id} className={row.id === id ? "text-white" : "text-neutral-300"}>
                      <td className="whitespace-nowrap px-2 py-2 font-mono">{row.session_date}</td>
                      <td className="max-w-[100px] truncate px-2 py-2">{row.track_name}</td>
                      <td className="px-2 py-2">{row.day_type ? (DAY_TYPE_LABEL[row.day_type] ?? row.day_type) : "—"}</td>
                      <td className="px-2 py-2 font-mono">{bestLapBySessionId.get(row.id) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium text-neutral-400">This day&apos;s log</h2>
            <SetupEntryLog entries={(todayEntries ?? []) as Entry[]} />
          </div>

          {priorDays.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-neutral-400">Previous days</h2>
              <ul className="flex max-h-[calc(100vh-8rem)] flex-col gap-3 overflow-y-auto pr-1">
                {priorDays.map(({ session: priorSession, entries }, index) => (
                  <li
                    key={`${priorSession.session_date}-${index}`}
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-medium text-white">{priorSession.track_name}</span>
                      <span className="font-mono text-xs text-neutral-500">
                        {priorSession.session_date}
                      </span>
                    </div>
                    <SetupEntryLog entries={entries} compact />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <label htmlFor={name} className="text-sm text-neutral-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={defaultValue ?? ""}
        className="w-32 rounded-lg border border-neutral-700 bg-neutral-800/80 px-2.5 py-1.5 text-right font-mono text-sm text-white shadow-sm transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:w-36"
      />
    </div>
  );
}

function SpecFields({ values }: { values: Record<string, unknown> | null }) {
  return (
    <>
      {SETUP_SHEET_GROUPS.map((group) => (
        <div key={group.title} className={cardClass}>
          <h2 className="mb-1 flex items-center gap-2 text-sm font-medium text-neutral-300">
            <span className="h-3.5 w-1 rounded-full bg-red-600" aria-hidden />
            {group.title.toUpperCase()}
          </h2>
          <div className="divide-y divide-neutral-800">
            {group.keys.map((key) => {
              const field = FIELD_BY_KEY.get(key)!;
              return (
                <Row
                  key={key}
                  label={field.label}
                  name={field.name}
                  defaultValue={values?.[key] as string | null | undefined}
                />
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
