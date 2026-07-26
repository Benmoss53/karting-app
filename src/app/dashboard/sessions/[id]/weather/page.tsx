import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertWeather } from "../actions";

export default async function WeatherPage({
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

  const { data: weather } = await supabase
    .from("weather_conditions")
    .select("*")
    .eq("session_id", id)
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <Link
        href={`/dashboard/sessions/${id}`}
        className="mb-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← {session.track_name}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900">
        Weather conditions
      </h1>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <form action={upsertWeather} className="flex flex-col gap-6">
          <input type="hidden" name="sessionId" value={session.id} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="trackConditions"
                className="mb-1.5 block text-sm font-medium text-zinc-700"
              >
                Track conditions
              </label>
              <select
                id="trackConditions"
                name="trackConditions"
                defaultValue={weather?.track_conditions ?? ""}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm capitalize shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">—</option>
                <option value="dry">Dry</option>
                <option value="damp">Damp</option>
                <option value="wet">Wet</option>
              </select>
            </div>
            <Field label="Air temp" name="airTemp" defaultValue={weather?.air_temp} />
            <Field label="Track temp" name="trackTemp" defaultValue={weather?.track_temp} />
            <Field label="Humidity" name="humidity" defaultValue={weather?.humidity} />
            <Field label="Wind" name="wind" defaultValue={weather?.wind} />
          </div>

          <div>
            <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={weather?.notes ?? ""}
              placeholder="Anything else worth remembering about conditions..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save weather conditions
          </button>
        </form>
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
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
