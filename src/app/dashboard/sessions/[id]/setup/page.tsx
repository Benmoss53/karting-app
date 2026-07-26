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
      <h1 className="text-2xl font-semibold">Setup sheet</h1>
      <p className="mb-6 text-sm text-zinc-600">{session.track_name}</p>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

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
          className="self-start rounded bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
        >
          Save setup sheet
        </button>
      </form>
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
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={defaultValue ?? ""}
        className="w-full rounded border border-zinc-300 px-3 py-2"
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
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded border border-zinc-300 px-3 py-2"
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
