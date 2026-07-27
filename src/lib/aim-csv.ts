// Parses telemetry CSV files exported from AiM RaceStudio3 (File -> Export -> CSV).
// Format: a metadata header block, a blank line, a column-name row, a units
// row, a blank line, then one data row per sample.

const METADATA_KEYS = new Set([
  "Format",
  "Session",
  "Vehicle",
  "Racer",
  "Championship",
  "Comment",
  "Date",
  "Time",
  "Sample Rate",
  "Duration",
  "Segment",
  "Beacon Markers",
  "Segment Times",
]);

export type AimCsvData = {
  meta: Record<string, string>;
  beaconMarkers: number[];
  segmentTimes: string[];
  columns: string[];
  units: string[];
  rows: number[][];
};

function parseCsvLine(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  const stripped = trimmed.replace(/^"/, "").replace(/"$/, "");
  return stripped.split('","');
}

export function parseAimCsv(text: string): AimCsvData {
  const lines = text.split(/\r?\n/);
  const meta: Record<string, string> = {};
  let beaconMarkers: number[] = [];
  let segmentTimes: string[] = [];
  let columns: string[] = [];
  let units: string[] = [];
  const rows: number[][] = [];

  let i = 0;

  for (; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length === 0) continue;
    const key = fields[0];

    if (key === "Time" && fields.length > 2) {
      columns = fields;
      i++;
      break;
    }

    if (!METADATA_KEYS.has(key)) continue;

    if (key === "Beacon Markers") {
      beaconMarkers = fields.slice(1).map(Number).filter((n) => !Number.isNaN(n));
    } else if (key === "Segment Times") {
      segmentTimes = fields.slice(1);
    } else {
      meta[key] = fields[1] ?? "";
    }
  }

  if (columns.length === 0) {
    throw new Error("Could not find the column header row in this file.");
  }

  for (; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length === 0) continue;
    units = fields;
    i++;
    break;
  }

  for (; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length === 0) continue;
    const row = fields.map(Number);
    if (row.some((n) => Number.isNaN(n))) continue;
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error("No data rows found in this file.");
  }

  return { meta, beaconMarkers, segmentTimes, columns, units, rows };
}

export type TracePoint = {
  distanceM: number;
  speedKmh: number;
};

export type LapSummary = {
  lap: number;
  lapTime: string | null;
  startTime: number;
  endTime: number;
  maxRpm: number | null;
  minRpm: number | null;
  maxSpeedKmh: number | null;
  speedTrace: TracePoint[];
};

export type AimCsvSummary = {
  session: string | null;
  racer: string | null;
  date: string | null;
  sampleRateHz: number | null;
  durationSeconds: number | null;
  sampleCount: number;
  maxRpm: number | null;
  minRpm: number | null;
  maxSpeedKmh: number | null;
  avgSpeedKmh: number | null;
  laps: LapSummary[];
};

function columnStats(idx: number, rowSubset: number[][]) {
  if (idx === -1 || rowSubset.length === 0) {
    return { max: null as number | null, min: null as number | null, avg: null as number | null };
  }
  let max = -Infinity;
  let min = Infinity;
  let sum = 0;
  for (const row of rowSubset) {
    const v = row[idx];
    if (v > max) max = v;
    if (v < min) min = v;
    sum += v;
  }
  return { max, min, avg: sum / rowSubset.length };
}

const MAX_TRACE_POINTS = 250;

function buildSpeedTrace(lapRows: number[][], speedIdx: number, distIdx: number): TracePoint[] {
  if (speedIdx === -1 || distIdx === -1 || lapRows.length === 0) return [];

  const baseDistance = lapRows[0][distIdx];
  const step = Math.max(1, Math.ceil(lapRows.length / MAX_TRACE_POINTS));

  const trace: TracePoint[] = [];
  for (let i = 0; i < lapRows.length; i += step) {
    trace.push({
      distanceM: lapRows[i][distIdx] - baseDistance,
      speedKmh: lapRows[i][speedIdx],
    });
  }
  const last = lapRows[lapRows.length - 1];
  if (trace[trace.length - 1]?.distanceM !== last[distIdx] - baseDistance) {
    trace.push({ distanceM: last[distIdx] - baseDistance, speedKmh: last[speedIdx] });
  }
  return trace;
}

export function summarizeAimCsv(parsed: AimCsvData): AimCsvSummary {
  const { meta, beaconMarkers, segmentTimes, columns, rows } = parsed;

  const timeIdx = 0;
  const rpmIdx = columns.indexOf("RPM");
  const speedIdx = columns.indexOf("GPS Speed");
  const distIdx = columns.indexOf("Distance on GPS Speed");
  const sampleRateHz = meta["Sample Rate"] ? Number(meta["Sample Rate"]) : null;

  const overallRpm = columnStats(rpmIdx, rows);
  const overallSpeed = columnStats(speedIdx, rows);

  const laps: LapSummary[] = [];
  let lapStart = 0;
  for (let lapNum = 0; lapNum < beaconMarkers.length; lapNum++) {
    const lapEnd = beaconMarkers[lapNum];
    const lapRows = rows.filter((row) => row[timeIdx] >= lapStart && row[timeIdx] < lapEnd);
    const rpmStats = columnStats(rpmIdx, lapRows);
    const speedStats = columnStats(speedIdx, lapRows);
    laps.push({
      lap: lapNum + 1,
      lapTime: segmentTimes[lapNum] ?? null,
      startTime: lapStart,
      endTime: lapEnd,
      maxRpm: rpmStats.max,
      minRpm: rpmStats.min,
      maxSpeedKmh: speedStats.max,
      speedTrace: buildSpeedTrace(lapRows, speedIdx, distIdx),
    });
    lapStart = lapEnd;
  }

  return {
    session: meta["Session"] || null,
    racer: meta["Racer"] || null,
    date: meta["Date"] || null,
    sampleRateHz,
    durationSeconds: meta["Duration"] ? Number(meta["Duration"]) : null,
    sampleCount: rows.length,
    maxRpm: overallRpm.max,
    minRpm: overallRpm.min,
    maxSpeedKmh: overallSpeed.max,
    avgSpeedKmh: overallSpeed.avg,
    laps,
  };
}
