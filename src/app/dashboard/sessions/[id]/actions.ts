"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function textOrNull(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function upsertSetupSheet(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sessionId = formData.get("sessionId") as string;

  const { error } = await supabase.from("setup_sheets").upsert(
    {
      session_id: sessionId,
      front_upper_crash_bar: textOrNull(formData, "frontUpperCrashBar"),
      front_lower_crash_bar: textOrNull(formData, "frontLowerCrashBar"),
      torsion_bar: textOrNull(formData, "torsionBar"),
      camber: textOrNull(formData, "camber"),
      caster: textOrNull(formData, "caster"),
      toe: textOrNull(formData, "toe"),
      front_track: textOrNull(formData, "frontTrack"),
      front_wheels: textOrNull(formData, "frontWheels"),
      ackerman: textOrNull(formData, "ackerman"),
      front_ride_height: textOrNull(formData, "frontRideHeight"),
      sidepods: textOrNull(formData, "sidepods"),
      third_bearing: textOrNull(formData, "thirdBearing"),
      axle: textOrNull(formData, "axle"),
      rear_ride_height: textOrNull(formData, "rearRideHeight"),
      rear_bar: textOrNull(formData, "rearBar"),
      rear_wheels: textOrNull(formData, "rearWheels"),
      seat_position_a: textOrNull(formData, "seatPositionA"),
      seat_position_b: textOrNull(formData, "seatPositionB"),
    },
    { onConflict: "session_id" },
  );

  if (error) {
    redirect(
      `/dashboard/sessions/${sessionId}/setup?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/dashboard/sessions/${sessionId}`);
  redirect(`/dashboard/sessions/${sessionId}`);
}

export async function addCoachEntry(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sessionId = formData.get("sessionId") as string;
  const changeMade = textOrNull(formData, "changeMade");
  const reaction = textOrNull(formData, "reaction");

  if (!changeMade || !reaction) {
    redirect(
      `/dashboard/sessions/${sessionId}/testing-setups?error=${encodeURIComponent(
        "Fill in both what you changed and what happened.",
      )}`,
    );
  }

  const { error } = await supabase.from("coach_entries").insert({
    session_id: sessionId,
    change_made: changeMade,
    reaction,
  });

  if (error) {
    redirect(
      `/dashboard/sessions/${sessionId}/testing-setups?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/dashboard/sessions/${sessionId}/testing-setups`);
  redirect(`/dashboard/sessions/${sessionId}/testing-setups`);
}
