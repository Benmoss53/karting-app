import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addCoachEntry } from "../actions";

export default async function CoachPage({
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
        className="mb-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← {session.track_name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Train your AI Coach
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Log what you changed on the kart and what happened as a result. Over time this
        builds the history your AI Coach will use to suggest changes.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <form action={addCoachEntry} className="flex flex-col gap-4">
          <input type="hidden" name="sessionId" value={session.id} />

          <div>
            <label
              htmlFor="changeMade"
              className="mb-1.5 block text-sm font-medium text-zinc-700"
            >
              What did you change?
            </label>
            <textarea
              id="changeMade"
              name="changeMade"
              rows={2}
              required
              placeholder="e.g. Added 2mm of positive camber"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="reaction" className="mb-1.5 block text-sm font-medium text-zinc-700">
              What was the kart&apos;s reaction?
            </label>
            <textarea
              id="reaction"
              name="reaction"
              rows={2}
              required
              placeholder="e.g. Gave more steer into the corner"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add entry
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-zinc-500">Entries this session</h2>
        {!entries || entries.length === 0 ? (
          <p className="text-sm text-zinc-500">No entries yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100">
            {entries.map((entry) => (
              <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    Change
                  </span>
                  <p className="text-zinc-900">{entry.change_made}</p>
                </div>
                <div className="mt-2 flex items-start gap-3">
                  <span className="mt-0.5 inline-flex shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                    Reaction
                  </span>
                  <p className="text-zinc-900">{entry.reaction}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
