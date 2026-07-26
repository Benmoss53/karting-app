"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const CRASH_BAR_VALUES = ["loose", "tight"];
const SEAT_STAYS_VALUES = ["on", "off"];

function textOrNull(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function enumOrNull(formData: FormData, key: string, allowed: string[]) {
  const value = textOrNull(formData, key);
  return value && allowed.includes(value) ? value : null;
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
      front_track: textOrNull(formData, "frontTrack"),
      rear_track: textOrNull(formData, "rearTrack"),
      caster: textOrNull(formData, "caster"),
      camber: textOrNull(formData, "camber"),
      toe: textOrNull(formData, "toe"),
      seat_position: textOrNull(formData, "seatPosition"),
      front_crash_bar: enumOrNull(formData, "frontCrashBar", CRASH_BAR_VALUES),
      rear_crash_bar: enumOrNull(formData, "rearCrashBar", CRASH_BAR_VALUES),
      axle_grade: textOrNull(formData, "axleGrade"),
      seat_grade: textOrNull(formData, "seatGrade"),
      axle_length: textOrNull(formData, "axleLength"),
      seat_stays: enumOrNull(formData, "seatStays", SEAT_STAYS_VALUES),
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
