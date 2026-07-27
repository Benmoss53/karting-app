import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertSetupSheet, saveSetupFeedback } from "../actions";
import { SETUP_SHEET_FIELDS } from "@/lib/setup-sheet";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-300";
const cardClass =
  "rounded-xl border border-white/10 bg-zinc-900/60 p-6 shadow-lg shadow-black/20 backdrop-blur-sm";

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

  const { data: setupSheet } = await supabase
    .from("setup_sheets")
    .select("*")
    .eq("session_id", id)
    .maybeSingle();

  // Every previous day's setup sheet, most recent first — used both to
  // carry forward defaults for a new sheet and to show the history sidebar.
  let priorEntries: { session: { track_name: string; session_date: string }; sheet: Record<string, unknown> | null }[] =
    [];
  if (user) {
    const { data: priorSessions } = await supabase
      .from("sessions")
      .select("id, track_name, session_date")
      .eq("driver_id", user.id)
      .lt("session_date", session.session_date)
      .order("session_date", { ascending: false });

    const priorIds = (priorSessions ?? []).map((s) => s.id);
    const { data: priorSheets } = priorIds.length
      ? await supabase.from("setup_sheets").select("*").in("session_id", priorIds)
      : { data: [] };

    const priorSheetBySession = new Map((priorSheets ?? []).map((row) => [row.session_id, row]));
    priorEntries = (priorSessions ?? []).map((s) => ({
      session: { track_name: s.track_name, session_date: s.session_date },
      sheet: priorSheetBySession.get(s.id) ?? null,
    }));
  }

  const previousSheet = priorEntries[0]?.sheet ?? null;
  const sheetDefaults = setupSheet ?? previousSheet;
  const isCarriedForward = !setupSheet && !!previousSheet;

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

          {isCarriedForward && (
            <p className="mb-4 rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-300 ring-1 ring-inset ring-blue-400/20">
              Carried forward from your last logged day — adjust what changed and submit.
            </p>
          )}

          {setupSheet?.computed_changes && (
            <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-400/20">
              Changed from last time: {setupSheet.computed_changes}
            </p>
          )}

          <form action={upsertSetupSheet} className="flex flex-col gap-6">
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
                    defaultValue={sheetDefaults?.[key] as string | null | undefined}
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
                    defaultValue={(sheetDefaults?.seat_position_a as string) ?? ""}
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
                    defaultValue={(sheetDefaults?.seat_position_b as string) ?? ""}
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

          <div className={`mt-6 ${cardClass} ${!setupSheet ? "opacity-50" : ""}`}>
            <h2 className="mb-1 text-sm font-medium text-zinc-400">After the session</h2>
            {setupSheet ? (
              <form action={saveSetupFeedback} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="sessionId" value={session.id} />
                <label htmlFor="feedback" className={labelClass}>
                  How did the kart feel?
                </label>
                <textarea
                  id="feedback"
                  name="feedback"
                  rows={3}
                  placeholder="e.g. Gave more steer into the corner but felt loose on exit"
                  defaultValue={setupSheet?.feedback ?? ""}
                  className={inputClass}
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center self-start rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(239,68,68,0.5)] transition-all duration-200 hover:scale-[1.02] hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-zinc-900 active:scale-[0.98]"
                >
                  Save feedback
                </button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Submit the setup above first.</p>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Previous days</h2>
          {priorEntries.length === 0 ? (
            <p className="text-sm text-zinc-500">No previous days logged yet.</p>
          ) : (
            <ul className="flex max-h-[calc(100vh-8rem)] flex-col gap-3 overflow-y-auto pr-1">
              {priorEntries.map(({ session: priorSession, sheet }, index) => (
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
                  {sheet ? (
                    <>
                      {sheet.computed_changes ? (
                        <p className="text-xs text-red-300">
                          Changed: {sheet.computed_changes as string}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-500">No changes recorded</p>
                      )}
                      {sheet.feedback ? (
                        <p className="mt-1.5 text-xs text-zinc-300">Felt: {sheet.feedback as string}</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-zinc-500">No setup sheet saved</p>
                  )}
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
