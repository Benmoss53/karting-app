"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_BY_TYPE } from "@/lib/storage";
import { parseAimCsv, summarizeAimCsv } from "@/lib/aim-csv";
import { SETUP_SHEET_FIELDS, diffSetupSheets } from "@/lib/setup-sheet";

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

  const newValues: Record<string, string | null> = {};
  for (const { name, key } of SETUP_SHEET_FIELDS) {
    newValues[key] = textOrNull(formData, name);
  }

  // Auto-detect what changed by diffing against the most recent previous
  // day's setup sheet, rather than asking the driver to write it down.
  let computedChanges: string | null = null;
  const { data: session } = await supabase
    .from("sessions")
    .select("session_date")
    .eq("id", sessionId)
    .single();

  if (session) {
    const { data: previousSession } = await supabase
      .from("sessions")
      .select("id")
      .eq("driver_id", user!.id)
      .lt("session_date", session.session_date)
      .order("session_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousSession) {
      const { data: previousSheet } = await supabase
        .from("setup_sheets")
        .select("*")
        .eq("session_id", previousSession.id)
        .maybeSingle();
      computedChanges = diffSetupSheets(previousSheet, newValues);
    }
  }

  const { error } = await supabase.from("setup_sheets").upsert(
    {
      session_id: sessionId,
      ...newValues,
      computed_changes: computedChanges,
    },
    { onConflict: "session_id" },
  );

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

export async function saveSetupFeedback(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sessionId = formData.get("sessionId") as string;
  const feedback = textOrNull(formData, "feedback");

  const { error } = await supabase
    .from("setup_sheets")
    .update({ feedback })
    .eq("session_id", sessionId);

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
  await supabase.storage.from(bucket).remove([file.storage_path]);

  const { error } = await supabase.from("telemetry_files").delete().eq("id", fileId);

  if (error) {
    errorRedirect(error.message);
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
