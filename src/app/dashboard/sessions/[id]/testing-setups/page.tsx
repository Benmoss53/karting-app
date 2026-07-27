import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addCoachEntry } from "../actions";
import AiCoachChat from "@/components/ai-coach-chat";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-300";

export default async function TestingSetupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, track_name")
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  const { data: entries } = await supabase
    .from("coach_entries")
    .select("id, change_made, reaction, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl">
      <Link
        href={`/dashboard/sessions/${id}`}
        className="mb-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
      >
        ← {session.track_name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
        Testing Setups
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Log what you changed on the kart and what happened as a result. Over time this
        builds the history your AI Coach will use to suggest changes.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-400/20">
          {error}
        </p>
      )}

      <div className="mb-6 rounded-xl border border-white/10 bg-zinc-900/60 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
        <form action={addCoachEntry} className="flex flex-col gap-4">
          <input type="hidden" name="sessionId" value={session.id} />

          <div>
            <label htmlFor="changeMade" className={labelClass}>
              What did you change?
            </label>
            <textarea
              id="changeMade"
              name="changeMade"
              rows={2}
              required
              placeholder="e.g. Added 2mm of positive camber"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="reaction" className={labelClass}>
              What was the kart&apos;s reaction?
            </label>
            <textarea
              id="reaction"
              name="reaction"
              rows={2}
              required
              placeholder="e.g. Gave more steer into the corner"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(37,99,235,0.7)] transition-all duration-200 hover:scale-[1.02] hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 active:scale-[0.98]"
          >
            Add entry
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur-sm">
        <h2 className="mb-4 text-sm font-medium text-zinc-400">Entries this session</h2>
        {!entries || entries.length === 0 ? (
          <p className="text-sm text-zinc-500">No entries yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10">
            {entries.map((entry) => (
              <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex shrink-0 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-inset ring-blue-400/20">
                    Change
                  </span>
                  <p className="text-zinc-100">{entry.change_made}</p>
                </div>
                <div className="mt-2 flex items-start gap-3">
                  <span className="mt-0.5 inline-flex shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-300 ring-1 ring-inset ring-red-400/20">
                    Reaction
                  </span>
                  <p className="text-zinc-100">{entry.reaction}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Speak To Your AI Coach</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Ask about setup changes for this session. It draws on the setup sheet, weather,
          and testing history logged above.
        </p>
        <AiCoachChat sessionId={session.id} entryCount={entries?.length ?? 0} />
      </div>
    </div>
  );
}
