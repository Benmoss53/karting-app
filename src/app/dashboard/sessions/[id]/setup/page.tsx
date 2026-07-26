import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertSetupSheet } from "../actions";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-300";

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
        className="mb-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
      >
        ← {session.track_name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
        Setup sheet
      </h1>
      <p className="mb-6 text-sm text-zinc-500">{session.track_name}</p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-400/20">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
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
            className="inline-flex items-center justify-center self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(37,99,235,0.7)] transition-all duration-200 hover:scale-[1.02] hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 active:scale-[0.98]"
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
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <input id={name} name={name} type="text" defaultValue={defaultValue ?? ""} className={inputClass} />
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
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className={`${inputClass} capitalize`}
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
