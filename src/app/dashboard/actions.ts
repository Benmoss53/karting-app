"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
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
      `${s.session_date} — ${s.track_name}${s.day_type ? ` (${s.day_type})` : ""}${s.kart ? `, kart ${s.kart}` : ""}${s.motor ? `, motor ${s.motor}` : ""}`,
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
      "You are an experienced karting race engineer talking directly to your driver, like you're leaning on the kart together after a session. You have the driver's full history across every session they've logged: setup sheets, weather conditions, and testing-setup entries (each a change made and the kart's reaction). Draw on patterns and lessons from every day when they're relevant — mention the specific date/track when you reference a past day. Ground recommendations in the actual logged data rather than generic advice. If there isn't enough history to support a confident recommendation, say so plainly.\n\n" +
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
