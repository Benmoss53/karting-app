"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const DAY_TYPE_VALUES = ["race_meeting", "test_day"];
const SKY_CONDITIONS_VALUES = ["sunny", "overcast"];

function textOrNull(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function enumOrNull(formData: FormData, key: string, allowed: string[]) {
  const value = textOrNull(formData, key);
  return value && allowed.includes(value) ? value : null;
}

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
  const dayType = enumOrNull(formData, "dayType", DAY_TYPE_VALUES);
  const kart = textOrNull(formData, "kart");
  const motor = textOrNull(formData, "motor");

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      driver_id: user.id,
      track_name: trackName,
      session_date: sessionDate || undefined,
      setup_notes: setupNotes || null,
      day_type: dayType,
      kart,
      motor,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/dashboard/new?error=${encodeURIComponent(error?.message ?? "Could not create session")}`,
    );
  }

  const temperature = textOrNull(formData, "temperature");
  const trackTemp = textOrNull(formData, "trackTemp");
  const windyValue = formData.get("windy");
  const windy = windyValue === "yes" ? true : windyValue === "no" ? false : null;
  const skyConditions = enumOrNull(formData, "skyConditions", SKY_CONDITIONS_VALUES);

  if (temperature || trackTemp || windy !== null || skyConditions) {
    await supabase.from("weather_conditions").insert({
      session_id: data.id,
      temperature,
      track_temp: trackTemp,
      windy,
      sky_conditions: skyConditions,
    });
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/sessions/${data.id}`);
}
