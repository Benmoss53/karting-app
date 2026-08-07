import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteSessionButton from "@/components/delete-session-button";
import { cardClass, pillClass } from "@/lib/dark-ui";

const DAY_TYPE_LABEL: Record<string, string> = {
  race_meeting: "Race meeting",
  test_day: "Test day",
};

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5z" />
    </svg>
  );
}

function GaugeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 14l4-4" />
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="M4 15h1M19 15h1M6 8l.7.7M18 8l-.7.7" />
    </svg>
  );
}

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M8 5v14M16 5v14M3 10h5M16 10h5M3 15h5M16 15h5" />
    </svg>
  );
}

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
      Icon: WrenchIcon,
    },
    {
      href: `/dashboard/sessions/${id}/mychron`,
      title: "Upload MyChron Data",
      description: "Telemetry files for this day",
      status: mychronCount ? `${mychronCount} file${mychronCount === 1 ? "" : "s"}` : "No files yet",
      Icon: GaugeIcon,
    },
    {
      href: `/dashboard/sessions/${id}/videos`,
      title: "Video Library",
      description: "SmartyCam footage for this day",
      status: videoCount ? `${videoCount} file${videoCount === 1 ? "" : "s"}` : "No footage yet",
      Icon: FilmIcon,
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
      <h1 className="text-2xl font-bold text-white sm:text-3xl">{session.track_name}</h1>
      <div className="mb-8 mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
        <span className="font-mono">{session.session_date}</span>
        {session.day_type && (
          <span className={pillClass}>{DAY_TYPE_LABEL[session.day_type] ?? session.day_type}</span>
        )}
        {session.kart && <span className="font-mono">Kart: {session.kart}</span>}
        {session.motor && <span className="font-mono">Motor: {session.motor}</span>}
        {weatherChips.map((chip) => (
          <span key={chip} className={`${pillClass} capitalize`}>
            {chip}
          </span>
        ))}
      </div>

      {session.setup_notes && (
        <div className={`mb-8 ${cardClass}`}>
          <h2 className="mb-2 text-sm font-medium text-neutral-400">Notes</h2>
          <p className="whitespace-pre-wrap text-white">{session.setup_notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {menuItems.map(({ href, title, description, status, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-600/50 hover:shadow-md active:translate-y-0"
          >
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-800 text-red-500">
              <Icon className="h-5 w-5" />
            </span>
            <span className="font-semibold text-white">{title}</span>
            <span className="mt-1 text-sm text-neutral-400">{description}</span>
            <span className="mt-3 font-mono text-xs font-medium uppercase tracking-wide text-neutral-500">
              {status}
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
