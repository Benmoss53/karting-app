import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertSetupSheet } from "../actions";

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

  const { data: session } = await supabase
    .from("sessions")
    .select("id, track_name")
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

  return (
    <div className="max-w-2xl">
      <Link
        href={`/dashboard/sessions/${id}`}
        className="mb-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← {session.track_name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Setup sheet
      </h1>
      <p className="mb-6 text-sm text-zinc-500">{session.track_name}</p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <form action={upsertSetupSheet} className="flex flex-col gap-6">
          <input type="hidden" name="sessionId" value={session.id} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Front track" name="frontTrack" defaultValue={setupSheet?.front_track} />
            <Field label="Rear track" name="rearTrack" defaultValue={setupSheet?.rear_track} />
            <Field label="Caster" name="caster" defaultValue={setupSheet?.caster} />
            <Field label="Camber" name="camber" defaultValue={setupSheet?.camber} />
            <Field label="Toe" name="toe" defaultValue={setupSheet?.toe} />
            <Field
              label="Seat position"
              name="seatPosition"
              defaultValue={setupSheet?.seat_position}
            />
            <Field label="Axle grade" name="axleGrade" defaultValue={setupSheet?.axle_grade} />
            <Field label="Seat grade" name="seatGrade" defaultValue={setupSheet?.seat_grade} />
            <Field label="Axle length" name="axleLength" defaultValue={setupSheet?.axle_length} />

            <SelectField
              label="Front crash bar"
              name="frontCrashBar"
              defaultValue={setupSheet?.front_crash_bar}
              options={["loose", "tight"]}
            />
            <SelectField
              label="Rear crash bar"
              name="rearCrashBar"
              defaultValue={setupSheet?.rear_crash_bar}
              options={["loose", "tight"]}
            />
            <SelectField
              label="Seat stays"
              name="seatStays"
              defaultValue={setupSheet?.seat_stays}
              options={["on", "off"]}
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save setup sheet
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

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: string[];
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm capitalize shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option} value={option} className="capitalize">
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
