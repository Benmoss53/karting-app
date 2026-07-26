import { createSession } from "../actions";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold">New session</h1>

      {params.error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
          {params.error}
        </p>
      )}

      <form action={createSession} className="flex flex-col gap-4">
        <div>
          <label htmlFor="trackName" className="mb-1 block text-sm font-medium">
            Track
          </label>
          <input
            id="trackName"
            name="trackName"
            type="text"
            required
            placeholder="e.g. PFI Kart Track"
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="sessionDate" className="mb-1 block text-sm font-medium">
            Date
          </label>
          <input
            id="sessionDate"
            name="sessionDate"
            type="date"
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="setupNotes" className="mb-1 block text-sm font-medium">
            Setup notes
          </label>
          <textarea
            id="setupNotes"
            name="setupNotes"
            rows={5}
            placeholder="Tire pressures, gearing, chassis adjustments..."
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="self-start rounded bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
        >
          Create session
        </button>
      </form>
    </div>
  );
}
