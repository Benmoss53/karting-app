import { createClient } from "@/lib/supabase/server";
import AiCoachChat from "@/components/ai-coach-chat";

export default async function AssistantPage() {
  const supabase = await createClient();
  const { count: feedbackCount } = await supabase
    .from("setup_sheets")
    .select("id", { count: "exact", head: true })
    .not("feedback", "is", null);

  return <AiCoachChat entryCount={feedbackCount ?? 0} />;
}
