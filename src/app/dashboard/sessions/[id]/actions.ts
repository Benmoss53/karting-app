"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
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

function compactRow(row: Record<string, unknown> | null | undefined) {
  if (!row) return null;
  const entries = Object.entries(row).filter(
    ([key, value]) => value !== null && !["id", "session_id", "created_at", "updated_at"].includes(key),
  );
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export async function askAiCoach(sessionId: string, question: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, track_name, session_date, day_type, kart, motor")
    .eq("driver_id", user!.id)
    .order("session_date", { ascending: true });

  const sessionIds = (sessions ?? []).map((s) => s.id);

  const [{ data: setupSheets }, { data: weatherRows }, { data: coachEntries }] = sessionIds.length
    ? await Promise.all([
        supabase.from("setup_sheets").select("*").in("session_id", sessionIds),
        supabase.from("weather_conditions").select("*").in("session_id", sessionIds),
        supabase
          .from("coach_entries")
          .select("session_id, change_made, reaction, created_at")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: true }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const setupBySession = new Map((setupSheets ?? []).map((row) => [row.session_id, row]));
  const weatherBySession = new Map((weatherRows ?? []).map((row) => [row.session_id, row]));
  const entriesBySession = new Map<string, { change_made: string; reaction: string }[]>();
  for (const entry of coachEntries ?? []) {
    const list = entriesBySession.get(entry.session_id) ?? [];
    list.push({ change_made: entry.change_made, reaction: entry.reaction });
    entriesBySession.set(entry.session_id, list);
  }

  const dayBlocks = (sessions ?? []).map((s) => {
    const setup = compactRow(setupBySession.get(s.id));
    const weather = compactRow(weatherBySession.get(s.id));
    const dayEntries = entriesBySession.get(s.id) ?? [];

    const lines = [
      `${s.session_date} — ${s.track_name}${s.day_type ? ` (${s.day_type})` : ""}${s.kart ? `, kart ${s.kart}` : ""}${s.motor ? `, motor ${s.motor}` : ""}${s.id === sessionId ? " [THIS IS THE CURRENT SESSION THE DRIVER IS ASKING ABOUT]" : ""}`,
    ];
    if (weather) lines.push(`  Weather: ${JSON.stringify(weather)}`);
    if (setup) lines.push(`  Setup sheet: ${JSON.stringify(setup)}`);
    if (dayEntries.length > 0) {
      lines.push(
        `  Testing history: ${dayEntries
          .map((entry) => `[Changed: ${entry.change_made} | Reaction: ${entry.reaction}]`)
          .join(" ")}`,
      );
    }
    return lines.join("\n");
  });

  const context =
    dayBlocks.length > 0
      ? `Driver's full history across every logged session, oldest first:\n\n${dayBlocks.join("\n\n")}`
      : "No sessions logged yet.";

  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 1536,
    output_config: { effort: "low" },
    system:
      "You are an experienced karting race engineer talking directly to your driver, like you're leaning on the kart together after a session. You have the driver's full history across every session they've logged: setup sheets, weather conditions, and testing-setup entries (each a change made and the kart's reaction). The session marked as the current session is the one the driver is asking about right now, but draw on patterns and lessons from every day when they're relevant — mention the specific date/track when you reference a past day. Ground recommendations in the actual logged data rather than generic advice. If there isn't enough history to support a confident recommendation, say so plainly.\n\n" +
      "Talk like a real person coaching another person, not a computer generating a report. Use plain, everyday words a driver would actually say out loud — 'loosen the rear a touch', not 'consider reducing rear grip coefficient'. Say what you'd say if you were standing next to them: direct, a little conversational, no corporate hedging ('it's important to note', 'as an AI', 'I would recommend considering'). Keep it short — 2-4 sentences for a normal question — and lead with the actual answer, not a restated version of their question. Write in plain sentences, not bullet points or headers, unless they specifically ask you to list out several distinct changes.\n\n" +
      context,
    messages: [{ role: "user", content: question }],
  });

  if (response.stop_reason === "refusal") {
    return "I can't help with that question.";
  }

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}
