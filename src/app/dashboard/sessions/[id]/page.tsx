import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SessionHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, track_name, session_date, setup_notes")
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  const [{ count: fileCount }, { data: weather }, { data: setupSheet }, { count: coachCount }] =
    await Promise.all([
      supabase
        .from("telemetry_files")
        .select("id", { count: "exact", head: true })
        .eq("session_id", id),
      supabase
        .from("weather_conditions")
        .select("id")
        .eq("session_id", id)
        .maybeSingle(),
      supabase.from("setup_sheets").select("id").eq("session_id", id).maybeSingle(),
      supabase
        .from("coach_entries")
        .select("id", { count: "exact", head: true })
        .eq("session_id", id),
    ]);

  const menuItems = [
    {
      href: `/dashboard/sessions/${id}/files`,
      title: "Download MyChron Data",
      description: "MyChron telemetry and SmartyCam video files",
      status: fileCount ? `${fileCount} file${fileCount === 1 ? "" : "s"}` : "No files yet",
      accent: "from-blue-600 to-blue-400",
    },
    {
      href: `/dashboard/sessions/${id}/weather`,
      title: "Weather conditions",
      description: "Track and air temp, humidity, wind",
      status: weather ? "Recorded" : "Not recorded",
      accent: "from-zinc-500 to-zinc-400",
    },
    {
      href: `/dashboard/sessions/${id}/setup`,
      title: "Saved setup sheet",
      description: "Track, caster, camber, toe, crash bars...",
      status: setupSheet ? "Saved" : "Not saved",
      accent: "from-blue-600 to-red-500",
    },
    {
      href: `/dashboard/sessions/${id}/coach`,
      title: "Train your AI Coach",
      description: "Log a change you made and how the kart reacted",
      status: coachCount ? `${coachCount} entr${coachCount === 1 ? "y" : "ies"}` : "No entries yet",
      accent: "from-red-600 to-red-400",
    },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        {session.track_name}
      </h1>
      <p className="mb-8 text-sm text-zinc-500">{session.session_date}</p>

      {session.setup_notes && (
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-zinc-500">Setup notes</h2>
          <p className="whitespace-pre-wrap text-zinc-900">{session.setup_notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
          >
            <span className={`mb-3 h-8 w-8 rounded-lg bg-gradient-to-br ${item.accent}`} />
            <span className="font-medium text-zinc-900 group-hover:text-blue-700">
              {item.title}
            </span>
            <span className="mt-1 text-sm text-zinc-500">{item.description}</span>
            <span className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
              {item.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
