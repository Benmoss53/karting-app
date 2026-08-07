import type { AimCsvSummary } from "@/lib/aim-csv";

// Lap times come out of the AiM CSV as raw strings — "47.892" for a
// sub-minute lap, "1:02.415" once a lap crosses a minute. Parse to seconds
// so laps can be compared across a session (and across multiple uploaded
// files), then re-render in the same compact format for display.
function parseLapTimeSeconds(raw: string): number | null {
  const trimmed = raw.trim();
  const withMinutes = /^(\d+):(\d+(?:\.\d+)?)$/.exec(trimmed);
  if (withMinutes) {
    return Number(withMinutes[1]) * 60 + Number(withMinutes[2]);
  }
  const plain = Number(trimmed);
  return Number.isFinite(plain) ? plain : null;
}

function formatLapSeconds(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds - mins * 60;
    return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
  }
  return seconds.toFixed(3);
}

/**
 * Fastest lap across every analyzed MyChron file logged for a session.
 * Returns null when there's no telemetry (or no lap data) to draw from —
 * callers should render that as "—" rather than guessing.
 */
export function bestLapFromSummaries(summaries: AimCsvSummary[]): string | null {
  let bestSeconds: number | null = null;

  for (const summary of summaries) {
    for (const lap of summary.laps ?? []) {
      if (!lap.lapTime) continue;
      const seconds = parseLapTimeSeconds(lap.lapTime);
      if (seconds === null) continue;
      if (bestSeconds === null || seconds < bestSeconds) bestSeconds = seconds;
    }
  }

  return bestSeconds === null ? null : formatLapSeconds(bestSeconds);
}
