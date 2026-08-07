import type { AimCsvSummary } from "@/lib/aim-csv";

// Lap times come out of the AiM CSV as raw strings — "47.892" for a
// sub-minute lap, "1:02.415" once a lap crosses a minute. Parse to seconds
// so laps can be compared, then re-render in the same compact format for
// display.
export function parseLapTimeSeconds(raw: string): number | null {
  const trimmed = raw.trim();
  const withMinutes = /^(\d+):(\d+(?:\.\d+)?)$/.exec(trimmed);
  if (withMinutes) {
    return Number(withMinutes[1]) * 60 + Number(withMinutes[2]);
  }
  const plain = Number(trimmed);
  return Number.isFinite(plain) ? plain : null;
}

export function formatLapSeconds(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds - mins * 60;
    return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
  }
  return seconds.toFixed(3);
}

/**
 * Fastest lap (in seconds) within a single analyzed MyChron file. Computed
 * once when a file is analyzed and stored alongside the summary, so the
 * dashboard's session list never has to re-parse the full summary (which
 * includes every lap's speed/RPM/lambda trace) just to show this number.
 */
export function bestLapSecondsFromSummary(summary: AimCsvSummary): number | null {
  let best: number | null = null;
  for (const lap of summary.laps ?? []) {
    if (!lap.lapTime) continue;
    const seconds = parseLapTimeSeconds(lap.lapTime);
    if (seconds === null) continue;
    if (best === null || seconds < best) best = seconds;
  }
  return best;
}
