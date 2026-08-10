"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_BY_TYPE } from "@/lib/storage";
import { parseAimCsv, summarizeAimCsv } from "@/lib/aim-csv";
import { SETUP_SHEET_FIELDS, diffSetupSheets } from "@/lib/setup-sheet";
import { bestLapSecondsFromSummary } from "@/lib/best-lap";

function textOrNull(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

// The single most recent setup entry across every session the driver has
// ever logged — this is the running "base" a new entry changes from,
// regardless of which day it was logged on.
async function getLatestEntry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: driverSessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("driver_id", userId);

  const driverSessionIds = (driverSessions ?? []).map((s) => s.id);
  if (driverSessionIds.length === 0) return null;

  const { data } = await supabase
    .from("setup_sheets")
    .select("*")
    .in("session_id", driverSessionIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function submitSetupEntry(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sessionId = formData.get("sessionId") as string;
  const errorRedirect = (message: string) =>
    redirect(`/dashboard/sessions/${sessionId}/setup?error=${encodeURIComponent(message)}`);

  const latestEntry = await getLatestEntry(supabase, user!.id);

  // Can't start a new change until the previous one's feedback is logged —
  // that feedback is what the next change is actually reacting to.
  if (latestEntry && !latestEntry.feedback) {
    errorRedirect("Log what the last change did before making another one.");
    return;
  }

  const newValues: Record<string, string | null> = {};
  for (const { name, key } of SETUP_SHEET_FIELDS) {
    newValues[key] = textOrNull(formData, name);
  }

  const computedChanges = diffSetupSheets(latestEntry, newValues);

  const { error } = await supabase.from("setup_sheets").insert({
    session_id: sessionId,
    ...newValues,
    computed_changes: computedChanges,
  });

  if (error) {
    errorRedirect(error.message);
    return;
  }

  revalidatePath(`/dashboard/sessions/${sessionId}`);
  revalidatePath(`/dashboard/sessions/${sessionId}/setup`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/sessions/${sessionId}/setup`);
}

export async function updateSetupEntry(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sessionId = formData.get("sessionId") as string;
  const entryId = formData.get("entryId") as string;
  const errorRedirect = (message: string) =>
    redirect(`/dashboard/sessions/${sessionId}/setup?error=${encodeURIComponent(message)}`);

  const newValues: Record<string, string | null> = {};
  for (const { name, key } of SETUP_SHEET_FIELDS) {
    newValues[key] = textOrNull(formData, name);
  }

  // Editing a change doesn't touch its computed_changes — that was fixed
  // relative to whatever came before it when it was first submitted.
  const { error } = await supabase.from("setup_sheets").update(newValues).eq("id", entryId);

  if (error) {
    errorRedirect(error.message);
    return;
  }

  revalidatePath(`/dashboard/sessions/${sessionId}`);
  revalidatePath(`/dashboard/sessions/${sessionId}/setup`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/sessions/${sessionId}/setup`);
}

export async function saveSetupFeedback(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sessionId = formData.get("sessionId") as string;
  const entryId = formData.get("entryId") as string;
  const feedback = textOrNull(formData, "feedback");

  const { error } = await supabase
    .from("setup_sheets")
    .update({ feedback })
    .eq("id", entryId);

  if (error) {
    redirect(
      `/dashboard/sessions/${sessionId}/setup?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/dashboard/sessions/${sessionId}`);
  revalidatePath(`/dashboard/sessions/${sessionId}/setup`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/sessions/${sessionId}/setup`);
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
    { telemetry_file_id: fileId, summary, best_lap_seconds: bestLapSecondsFromSummary(summary) },
    { onConflict: "telemetry_file_id" },
  );

  if (upsertError) {
    errorRedirect(upsertError.message);
    return;
  }

  revalidatePath(`/dashboard/sessions/${sessionId}/mychron`);
  redirect(`/dashboard/sessions/${sessionId}/mychron`);
}

export async function deleteTelemetryFile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sessionId = formData.get("sessionId") as string;
  const fileId = formData.get("fileId") as string;
  // Callers (the session detail page, the MyChron page, the videos page)
  // each want to land back where they started, not always on /mychron.
  const redirectTo =
    (formData.get("redirectTo") as string | null) || `/dashboard/sessions/${sessionId}`;
  const errorRedirect = (message: string) =>
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);

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
  await supabase.storage.from(bucket).remove([file.storage_path]);

  const { error } = await supabase.from("telemetry_files").delete().eq("id", fileId);

  if (error) {
    errorRedirect(error.message);
    return;
  }

  revalidatePath(`/dashboard/sessions/${sessionId}`);
  revalidatePath(`/dashboard/sessions/${sessionId}/mychron`);
  revalidatePath(`/dashboard/sessions/${sessionId}/videos`);
  redirect(redirectTo);
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
