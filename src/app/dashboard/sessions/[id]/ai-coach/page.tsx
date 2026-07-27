import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AiCoachChat from "@/components/ai-coach-chat";

export default async function AiCoachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, track_name")
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  const { count: entryCount } = await supabase
    .from("coach_entries")
    .select("id", { count: "exact", head: true })
    .eq("session_id", id);

  return (
    <div className="max-w-2xl">
      <Link
        href={`/dashboard/sessions/${id}`}
        className="mb-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
      >
        ← {session.track_name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
        Speak To Your AI Coach
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Ask about setup changes for this session. It draws on the setup sheet, weather, and{" "}
        <Link
          href={`/dashboard/sessions/${id}/testing-setups`}
          className="font-medium text-blue-400 hover:text-blue-300"
        >
          Testing Setups
        </Link>{" "}
        history logged for this day.
      </p>

      <AiCoachChat sessionId={session.id} entryCount={entryCount ?? 0} />
    </div>
  );
}
