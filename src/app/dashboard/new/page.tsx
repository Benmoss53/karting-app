import { createSession } from "../actions";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-300";
const cardClass =
  "rounded-xl border border-white/10 bg-zinc-900/60 p-6 shadow-lg shadow-black/20 backdrop-blur-sm";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-50">
        Add a test / race day
      </h1>

      {params.error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-400/20">
          {params.error}
        </p>
      )}

      <form action={createSession} className="flex flex-col gap-6">
        <div className={cardClass}>
          <h2 className="mb-4 text-sm font-medium text-zinc-400">Day info</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="trackName" className={labelClass}>
                Track
              </label>
              <input
                id="trackName"
                name="trackName"
                type="text"
                required
                placeholder="e.g. PFI Kart Track"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sessionDate" className={labelClass}>
                  Date
                </label>
                <input id="sessionDate" name="sessionDate" type="date" className={inputClass} />
              </div>
              <div>
                <label htmlFor="dayType" className={labelClass}>
                  Race meeting or test day
                </label>
                <select
                  id="dayType"
                  name="dayType"
                  defaultValue="test_day"
                  className={inputClass}
                >
                  <option value="test_day">Test day</option>
                  <option value="race_meeting">Race meeting</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="kart" className={labelClass}>
                  Kart
                </label>
                <input
                  id="kart"
                  name="kart"
                  type="text"
                  placeholder="e.g. Kart 2"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="motor" className={labelClass}>
                  Motor
                </label>
                <input
                  id="motor"
                  name="motor"
                  type="text"
                  placeholder="e.g. TM KZ10C #4"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="mb-4 text-sm font-medium text-zinc-400">Weather conditions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="temperature" className={labelClass}>
                Temperature
              </label>
              <input
                id="temperature"
                name="temperature"
                type="text"
                placeholder="e.g. 22C"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="windy" className={labelClass}>
                Windy
              </label>
              <select id="windy" name="windy" defaultValue="" className={inputClass}>
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label htmlFor="trackTemp" className={labelClass}>
                Track temp <span className="font-normal text-zinc-500">(optional)</span>
              </label>
              <input
                id="trackTemp"
                name="trackTemp"
                type="text"
                placeholder="e.g. 34C"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="skyConditions" className={labelClass}>
                Sky
              </label>
              <select id="skyConditions" name="skyConditions" defaultValue="" className={inputClass}>
                <option value="">—</option>
                <option value="sunny">Sunny</option>
                <option value="overcast">Overcast</option>
              </select>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <label htmlFor="setupNotes" className={labelClass}>
            Notes <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <textarea
            id="setupNotes"
            name="setupNotes"
            rows={3}
            placeholder="Anything else worth remembering about the day..."
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center self-start rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(37,99,235,0.7)] transition-all duration-200 hover:scale-[1.02] hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black active:scale-[0.98]"
        >
          Add day
        </button>
      </form>
    </div>
  );
}
