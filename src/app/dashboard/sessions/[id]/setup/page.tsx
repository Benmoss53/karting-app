import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertSetupSheet } from "../actions";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-300";
const cardClass =
  "rounded-xl border border-white/10 bg-zinc-900/60 p-6 shadow-lg shadow-black/20 backdrop-blur-sm";

const FIELDS: { label: string; name: string; key: string }[] = [
  { label: "Front upper crash bar", name: "frontUpperCrashBar", key: "front_upper_crash_bar" },
  { label: "Front lower crash bar", name: "frontLowerCrashBar", key: "front_lower_crash_bar" },
  { label: "Torsion bar", name: "torsionBar", key: "torsion_bar" },
  { label: "Camber", name: "camber", key: "camber" },
  { label: "Caster", name: "caster", key: "caster" },
  { label: "Toe", name: "toe", key: "toe" },
  { label: "Front track", name: "frontTrack", key: "front_track" },
  { label: "Front wheels", name: "frontWheels", key: "front_wheels" },
  { label: "Ackerman", name: "ackerman", key: "ackerman" },
  { label: "Front ride height", name: "frontRideHeight", key: "front_ride_height" },
  { label: "Sidepods", name: "sidepods", key: "sidepods" },
  { label: "3rd bearing", name: "thirdBearing", key: "third_bearing" },
  { label: "Axle", name: "axle", key: "axle" },
  { label: "Rear ride height", name: "rearRideHeight", key: "rear_ride_height" },
  { label: "Rear bar", name: "rearBar", key: "rear_bar" },
  { label: "Rear wheels", name: "rearWheels", key: "rear_wheels" },
];

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
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Setup sheet</h1>
      <p className="mb-6 text-sm text-zinc-500">{session.track_name}</p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-400/20">
          {error}
        </p>
      )}

      <form action={upsertSetupSheet} className="flex flex-col gap-6">
        <input type="hidden" name="sessionId" value={session.id} />

        <div className={cardClass}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map(({ label, name, key }) => (
              <Field key={key} label={label} name={name} defaultValue={setupSheet?.[key]} />
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
                defaultValue={setupSheet?.seat_position_a ?? ""}
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
                defaultValue={setupSheet?.seat_position_b ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(37,99,235,0.7)] transition-all duration-200 hover:scale-[1.02] hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 active:scale-[0.98]"
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
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <input id={name} name={name} type="text" defaultValue={defaultValue ?? ""} className={inputClass} />
    </div>
  );
}
