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

  const [{ data: weather }, { count: mychronCount }, { count: videoCount }, { data: setupEntries }] =
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
      supabase.from("setup_sheets").select("id, feedback").eq("session_id", id),
    ]);

  const entryCount = setupEntries?.length ?? 0;
  const pendingFeedback = (setupEntries ?? []).some((entry) => !entry.feedback);

  const menuItems = [
    {
      href: `/dashboard/sessions/${id}/setup`,
      title: "Setup Sheet",
      description: "Track, caster, camber, toe, crash bars — plus what changed and how it felt",
      status:
        entryCount === 0
          ? "Not started"
          : `${entryCount} change${entryCount === 1 ? "" : "s"}${pendingFeedback ? " · feedback pending" : ""}`,
      accent: "bg-blue-600",
    },
    {
      href: `/dashboard/sessions/${id}/mychron`,
      title: "Upload MyChron Data",
      description: "Telemetry files for this day",
      status: mychronCount ? `${mychronCount} file${mychronCount === 1 ? "" : "s"}` : "No files yet",
      accent: "bg-violet-600",
    },
    {
      href: `/dashboard/sessions/${id}/videos`,
      title: "Video Library",
      description: "SmartyCam footage for this day",
      status: videoCount ? `${videoCount} file${videoCount === 1 ? "" : "s"}` : "No footage yet",
      accent: "bg-amber-500",
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
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {session.track_name}
      </h1>
      <div className="mb-8 mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <span className="font-mono">{session.session_date}</span>
        {session.day_type && (
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
            {DAY_TYPE_LABEL[session.day_type] ?? session.day_type}
          </span>
        )}
        {session.kart && <span className="font-mono">Kart: {session.kart}</span>}
        {session.motor && <span className="font-mono">Motor: {session.motor}</span>}
        {weatherChips.map((chip) => (
          <span
            key={chip}
            className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 font-mono text-xs font-medium capitalize text-blue-700 ring-1 ring-inset ring-blue-200"
          >
            {chip}
          </span>
        ))}
      </div>

      {session.setup_notes && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-slate-500">Notes</h2>
          <p className="whitespace-pre-wrap text-slate-900">{session.setup_notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md active:translate-y-0"
          >
            <span className={`mb-3 h-8 w-8 rounded-lg ${item.accent}`} />
            <span className="font-medium text-slate-900 group-hover:text-blue-700">
              {item.title}
            </span>
            <span className="mt-1 text-sm text-slate-500">{item.description}</span>
            <span className="mt-3 font-mono text-xs font-medium uppercase tracking-wide text-slate-400">
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
