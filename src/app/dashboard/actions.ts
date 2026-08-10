"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { AimCsvSummary } from "@/lib/aim-csv";
import { getWeatherForLocation } from "@/lib/weather";

const DAY_TYPE_VALUES = ["race_meeting", "practice", "test_day", "other"];
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
  const sessionTime = textOrNull(formData, "sessionTime");
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
      session_time: sessionTime,
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

export async function getWeatherSuggestion(trackName: string, sessionDate: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!trackName.trim() || !sessionDate) {
    return { error: "Enter a track name and date first." };
  }

  return getWeatherForLocation(trackName, sessionDate);
}

function compactRow(row: Record<string, unknown> | null | undefined) {
  if (!row) return null;
  const entries = Object.entries(row).filter(
    ([key, value]) => value !== null && !["id", "session_id", "created_at", "updated_at"].includes(key),
  );
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export async function askAiCoach(question: string) {
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

  const [{ data: runs }, { data: setupEntries }, { data: weatherRows }, { data: telemetryFiles }] =
    sessionIds.length
      ? await Promise.all([
          supabase
            .from("runs")
            .select("id, run_number, session_id")
            .in("session_id", sessionIds)
            .order("run_number", { ascending: true }),
          supabase
            .from("setup_sheets")
            .select("*")
            .in("session_id", sessionIds)
            .order("created_at", { ascending: true }),
          supabase.from("weather_conditions").select("*").in("session_id", sessionIds),
          supabase
            .from("telemetry_files")
            .select("id, run_id, file_name")
            .in("session_id", sessionIds)
            .in("file_type", ["mychron", "other"]),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const runsBySession = new Map<string, { id: string; run_number: number }[]>();
  for (const run of runs ?? []) {
    const list = runsBySession.get(run.session_id) ?? [];
    list.push(run);
    runsBySession.set(run.session_id, list);
  }

  const entryByRun = new Map<string, Record<string, unknown>>();
  for (const row of setupEntries ?? []) {
    if (row.run_id) entryByRun.set(row.run_id as string, row);
  }
  const weatherBySession = new Map((weatherRows ?? []).map((row) => [row.session_id, row]));

  const fileIds = (telemetryFiles ?? []).map((f) => f.id);
  const { data: analyses } = fileIds.length
    ? await supabase
        .from("telemetry_analysis")
        .select("telemetry_file_id, summary")
        .in("telemetry_file_id", fileIds)
    : { data: [] };
  const summaryByFileId = new Map(
    (analyses ?? []).map((a) => [a.telemetry_file_id as string, a.summary as AimCsvSummary]),
  );

  const telemetryByRun = new Map<string, { fileName: string; summary: AimCsvSummary }[]>();
  for (const file of telemetryFiles ?? []) {
    if (!file.run_id) continue;
    const summary = summaryByFileId.get(file.id);
    if (!summary) continue;
    const list = telemetryByRun.get(file.run_id) ?? [];
    list.push({ fileName: file.file_name, summary });
    telemetryByRun.set(file.run_id, list);
  }

  const dayBlocks = (sessions ?? []).map((s) => {
    const weather = compactRow(weatherBySession.get(s.id));
    const dayRuns = runsBySession.get(s.id) ?? [];

    const lines = [
      `${s.session_date} — ${s.track_name}${s.day_type ? ` (${s.day_type})` : ""}${s.kart ? `, kart ${s.kart}` : ""}${s.motor ? `, motor ${s.motor}` : ""}`,
    ];
    if (weather) lines.push(`  Weather: ${JSON.stringify(weather)}`);

    dayRuns.forEach((run) => {
      const entry = entryByRun.get(run.id);
      const telemetry = telemetryByRun.get(run.id) ?? [];
      if (!entry && telemetry.length === 0) return;

      lines.push(`  Session ${run.run_number}:`);

      if (entry) {
        const computedChanges = entry.computed_changes as string | null | undefined;
        const feedback = entry.feedback as string | null | undefined;
        const setup = compactRow({ ...entry, computed_changes: null, feedback: null });
        if (setup) lines.push(`    Setup: ${JSON.stringify(setup)}`);
        if (computedChanges) lines.push(`    Changed from previous entry: ${computedChanges}`);
        lines.push(`    How it felt: ${feedback ?? "not logged yet"}`);
      } else {
        lines.push(`    No setup change logged for this session.`);
      }

      telemetry.forEach(({ fileName, summary }) => {
        const highlights = [
          summary.maxRpm != null ? `max RPM ${Math.round(summary.maxRpm)}` : null,
          summary.maxSpeedKmh != null ? `max speed ${summary.maxSpeedKmh.toFixed(1)} km/h` : null,
          summary.avgSpeedKmh != null ? `avg speed ${summary.avgSpeedKmh.toFixed(1)} km/h` : null,
          summary.maxLateralG != null ? `max lateral G ${summary.maxLateralG.toFixed(2)}` : null,
          summary.avgLambda != null ? `avg lambda ${summary.avgLambda.toFixed(2)}` : null,
          summary.laps?.length ? `${summary.laps.length} laps` : null,
        ]
          .filter(Boolean)
          .join(", ");
        lines.push(`    Telemetry (${fileName}): ${highlights || "no stats available"}`);
      });
    });

    return lines.join("\n");
  });

  const context =
    dayBlocks.length > 0
      ? `Driver's full history across every logged day, oldest first. Each day can have several sessions (runs at the track), each with its own optional setup change and telemetry — sessions are numbered in the order they happened:\n\n${dayBlocks.join("\n\n")}`
      : "No sessions logged yet.";

  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 1536,
    output_config: { effort: "low" },
    system:
      "You are an experienced karting race engineer talking directly to your driver, like you're leaning on the kart together after a session. You have the driver's full history across every day they've logged. Each day can have several sessions (individual runs at the track that day), and each session can have its own setup change and its own telemetry. A setup change has the full spec at that point, an automatically computed summary of what changed from the previous change, and feedback on how the kart felt afterward — that feedback is what the next change was reacting to. Telemetry, where analyzed, gives max RPM, max/avg speed, max lateral G, avg lambda, and lap count for that specific session. Cross-reference a session's telemetry against its setup and feedback when it's relevant — e.g. a lean lambda reading or a lower max RPM can explain a feel the driver described. Draw on patterns and lessons from every day and session when they're relevant — mention the specific date/track/session when you reference a past one. Ground recommendations in the actual logged data rather than generic advice. If there isn't enough history to support a confident recommendation, say so plainly.\n\n" +
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
