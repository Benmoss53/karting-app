import { createSession } from "../actions";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900">
        New session
      </h1>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {params.error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {params.error}
          </p>
        )}

        <form action={createSession} className="flex flex-col gap-4">
          <div>
            <label htmlFor="trackName" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Track
            </label>
            <input
              id="trackName"
              name="trackName"
              type="text"
              required
              placeholder="e.g. PFI Kart Track"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="sessionDate" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Date
            </label>
            <input
              id="sessionDate"
              name="sessionDate"
              type="date"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="setupNotes" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Setup notes
            </label>
            <textarea
              id="setupNotes"
              name="setupNotes"
              rows={5}
              placeholder="Tire pressures, gearing, chassis adjustments..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="mt-2 inline-flex items-center justify-center self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create session
          </button>
        </form>
      </div>
    </div>
  );
}
