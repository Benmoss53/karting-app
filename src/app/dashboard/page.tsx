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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your sessions</h1>
        <Link
          href="/dashboard/new"
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
        >
          New session
        </Link>
      </div>

      {!sessions || sessions.length === 0 ? (
        <p className="text-zinc-600">
          No sessions yet. Create one to start uploading telemetry.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/dashboard/sessions/${session.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
              >
                <span className="font-medium">{session.track_name}</span>
                <span className="text-sm text-zinc-600">
                  {session.session_date}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
