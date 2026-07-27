import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteSessionButton from "@/components/delete-session-button";

const DAY_TYPE_LABEL: Record<string, string> = {
  race_meeting: "Race meeting",
  test_day: "Test day",
};

export default async function SessionHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, track_name, session_date, setup_notes, day_type, kart, motor")
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  const [{ data: weather }, { count: mychronCount }, { count: videoCount }, { data: setupSheet }] =
    await Promise.all([
      supabase
        .from("weather_conditions")
        .select("temperature, windy, track_temp, sky_conditions")
        .eq("session_id", id)
        .maybeSingle(),
      supabase
        .from("telemetry_files")
        .select("id", { count: "exact", head: true })
        .eq("session_id", id)
        .in("file_type", ["mychron", "other"]),
      supabase
        .from("telemetry_files")
        .select("id", { count: "exact", head: true })
        .eq("session_id", id)
        .eq("file_type", "video"),
      supabase.from("setup_sheets").select("id, feedback").eq("session_id", id).maybeSingle(),
    ]);

  const menuItems = [
    {
      href: `/dashboard/sessions/${id}/setup`,
      title: "Setup Sheet",
      description: "Track, caster, camber, toe, crash bars — plus what changed and how it felt",
      status: setupSheet ? (setupSheet.feedback ? "Saved · feedback logged" : "Saved") : "Not saved",
      accent: "from-blue-500 to-blue-400",
      glow: "hover:shadow-blue-500/10 hover:border-blue-400/40",
    },
    {
      href: `/dashboard/sessions/${id}/mychron`,
      title: "Upload MyChron Data",
      description: "Telemetry files for this day",
      status: mychronCount ? `${mychronCount} file${mychronCount === 1 ? "" : "s"}` : "No files yet",
      accent: "from-zinc-400 to-zinc-500",
      glow: "hover:shadow-white/5 hover:border-white/30",
    },
    {
      href: `/dashboard/sessions/${id}/videos`,
      title: "Video Library",
      description: "SmartyCam footage for this day",
      status: videoCount ? `${videoCount} file${videoCount === 1 ? "" : "s"}` : "No footage yet",
      accent: "from-red-400 to-blue-400",
      glow: "hover:shadow-red-500/10 hover:border-red-400/40",
    },
  ];

  const weatherChips = weather
    ? [
        weather.sky_conditions,
        weather.temperature,
        weather.track_temp ? `Track ${weather.track_temp}` : null,
        weather.windy === null ? null : weather.windy ? "Windy" : "Calm",
      ].filter(Boolean)
    : [];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
        {session.track_name}
      </h1>
      <div className="mb-8 mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
        <span className="font-mono">{session.session_date}</span>
        {session.day_type && (
          <span className="inline-flex rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-zinc-300 ring-1 ring-inset ring-white/10">
            {DAY_TYPE_LABEL[session.day_type] ?? session.day_type}
          </span>
        )}
        {session.kart && <span className="font-mono">Kart: {session.kart}</span>}
        {session.motor && <span className="font-mono">Motor: {session.motor}</span>}
        {weatherChips.map((chip) => (
          <span
            key={chip}
            className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 font-mono text-xs font-medium capitalize text-blue-300 ring-1 ring-inset ring-blue-400/20"
          >
            {chip}
          </span>
        ))}
      </div>

      {session.setup_notes && (
        <div className="mb-8 rounded-xl border border-white/10 bg-zinc-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur-sm">
          <h2 className="mb-2 text-sm font-medium text-zinc-400">Notes</h2>
          <p className="whitespace-pre-wrap text-zinc-100">{session.setup_notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex flex-col rounded-xl border border-white/10 bg-zinc-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur-sm transition-all duration-200 hover:scale-[1.015] active:scale-[0.99] ${item.glow}`}
          >
            <span className={`mb-3 h-8 w-8 rounded-lg bg-gradient-to-br ${item.accent}`} />
            <span className="font-medium text-zinc-50 group-hover:text-blue-300">
              {item.title}
            </span>
            <span className="mt-1 text-sm text-zinc-400">{item.description}</span>
            <span className="mt-3 font-mono text-xs font-medium uppercase tracking-wide text-zinc-500">
              {item.status}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <DeleteSessionButton sessionId={session.id} trackName={session.track_name} />
      </div>
    </div>
  );
}
