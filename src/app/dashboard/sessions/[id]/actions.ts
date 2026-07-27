"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_BY_TYPE } from "@/lib/storage";
import { parseAimCsv, summarizeAimCsv } from "@/lib/aim-csv";

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

export async function analyzeTelemetryFile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sessionId = formData.get("sessionId") as string;
  const fileId = formData.get("fileId") as string;
  const errorRedirect = (message: string) =>
    redirect(`/dashboard/sessions/${sessionId}/mychron?error=${encodeURIComponent(message)}`);

  const { data: file, error: fileError } = await supabase
    .from("telemetry_files")
    .select("storage_path, file_type")
    .eq("id", fileId)
    .single();

  if (fileError || !file) {
    errorRedirect("File not found.");
    return;
  }

  const bucket = BUCKET_BY_TYPE[file.file_type] ?? "telemetry";
  const { data: blob, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(file.storage_path);

  if (downloadError || !blob) {
    errorRedirect("Could not download this file.");
    return;
  }

  const text = await blob.text();

  let summary;
  try {
    summary = summarizeAimCsv(parseAimCsv(text));
  } catch {
    errorRedirect(
      "Couldn't read this as an AiM CSV export. Make sure you exported via RaceStudio3 -> File -> Export -> CSV.",
    );
    return;
  }

  const { error: upsertError } = await supabase.from("telemetry_analysis").upsert(
    { telemetry_file_id: fileId, summary },
    { onConflict: "telemetry_file_id" },
  );

  if (upsertError) {
    errorRedirect(upsertError.message);
    return;
  }

  revalidatePath(`/dashboard/sessions/${sessionId}/mychron`);
  redirect(`/dashboard/sessions/${sessionId}/mychron`);
}

export async function deleteSession(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sessionId = formData.get("sessionId") as string;

  const { data: files } = await supabase
    .from("telemetry_files")
    .select("storage_path, file_type")
    .eq("session_id", sessionId);

  if (files && files.length > 0) {
    const pathsByBucket = new Map<string, string[]>();
    for (const file of files) {
      const bucket = BUCKET_BY_TYPE[file.file_type] ?? "telemetry";
      const paths = pathsByBucket.get(bucket) ?? [];
      paths.push(file.storage_path);
      pathsByBucket.set(bucket, paths);
    }
    await Promise.all(
      [...pathsByBucket.entries()].map(([bucket, paths]) =>
        supabase.storage.from(bucket).remove(paths),
      ),
    );
  }

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);

  if (error) {
    redirect(`/dashboard/sessions/${sessionId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
