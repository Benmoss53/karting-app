import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, track_name, session_date")
    .order("session_date", { ascending: false });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Your sessions
        </h1>
        <Link
          href="/dashboard/new"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          New session
        </Link>
      </div>

      {!sessions || sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
          <p className="text-zinc-600">
            No sessions yet. Create one to start uploading telemetry.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/dashboard/sessions/${session.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-blue-300 hover:shadow-md"
              >
                <span className="font-medium text-zinc-900">{session.track_name}</span>
                <span className="text-sm text-zinc-500">{session.session_date}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
