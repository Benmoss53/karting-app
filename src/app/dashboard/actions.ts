"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSession(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const trackName = formData.get("trackName") as string;
  const sessionDate = formData.get("sessionDate") as string;
  const setupNotes = formData.get("setupNotes") as string;

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      driver_id: user.id,
      track_name: trackName,
      session_date: sessionDate || undefined,
      setup_notes: setupNotes || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/dashboard/new?error=${encodeURIComponent(error?.message ?? "Could not create session")}`,
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/sessions/${data.id}`);
}
