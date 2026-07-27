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
  rpm: number | null;
  lambda: number | null;
};

export type LapSummary = {
  lap: number;
  lapTime: string | null;
  startTime: number;
  endTime: number;
  maxRpm: number | null;
  minRpm: number | null;
  maxSpeedKmh: number | null;
  maxLateralG: number | null;
  avgLambda: number | null;
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
  maxLateralG: number | null;
  minLambda: number | null;
  maxLambda: number | null;
  avgLambda: number | null;
  laps: LapSummary[];
};

// AiM devices label the lateral accelerometer channel differently depending
// on configuration (e.g. "GPS LatAcc", "Lateral Acc", "Ay"), so detect it by
// unit ("g") plus a loose name match rather than an exact column name.
function findLateralGColumn(columns: string[], units: string[]): number {
  const gIndexes: number[] = [];
  for (let i = 0; i < columns.length; i++) {
    if (/^g$/i.test((units[i] ?? "").trim())) gIndexes.push(i);
  }

  const named = gIndexes.find((idx) => /lat/i.test(columns[idx]));
  if (named !== undefined) return named;

  // Only one unlabeled g-channel logged — assume it's lateral (cornering),
  // the most common single-axis setup in karting data loggers.
  return gIndexes.length === 1 ? gIndexes[0] : -1;
}

function maxAbs(idx: number, rowSubset: number[][]): number | null {
  if (idx === -1 || rowSubset.length === 0) return null;
  let max = 0;
  for (const row of rowSubset) {
    const v = Math.abs(row[idx]);
    if (v > max) max = v;
  }
  return max;
}

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

function buildTrace(
  lapRows: number[][],
  speedIdx: number,
  distIdx: number,
  rpmIdx: number,
  lambdaIdx: number,
): TracePoint[] {
  if (speedIdx === -1 || distIdx === -1 || lapRows.length === 0) return [];

  const baseDistance = lapRows[0][distIdx];
  const step = Math.max(1, Math.ceil(lapRows.length / MAX_TRACE_POINTS));

  const point = (row: number[]): TracePoint => ({
    distanceM: row[distIdx] - baseDistance,
    speedKmh: row[speedIdx],
    rpm: rpmIdx === -1 ? null : row[rpmIdx],
    lambda: lambdaIdx === -1 ? null : row[lambdaIdx],
  });

  const trace: TracePoint[] = [];
  for (let i = 0; i < lapRows.length; i += step) {
    trace.push(point(lapRows[i]));
  }
  const last = lapRows[lapRows.length - 1];
  if (trace[trace.length - 1]?.distanceM !== last[distIdx] - baseDistance) {
    trace.push(point(last));
  }
  return trace;
}

export function summarizeAimCsv(parsed: AimCsvData): AimCsvSummary {
  const { meta, beaconMarkers, segmentTimes, columns, units, rows } = parsed;

  const timeIdx = 0;
  const rpmIdx = columns.indexOf("RPM");
  const speedIdx = columns.indexOf("GPS Speed");
  const distIdx = columns.indexOf("Distance on GPS Speed");
  const sampleRateHz = meta["Sample Rate"] ? Number(meta["Sample Rate"]) : null;
  const lateralIdx = findLateralGColumn(columns, units);
  const lambdaIdx = columns.findIndex((c) => /lambda/i.test(c));

  const overallRpm = columnStats(rpmIdx, rows);
  const overallSpeed = columnStats(speedIdx, rows);
  const overallLambda = columnStats(lambdaIdx, rows);

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
      maxLateralG: maxAbs(lateralIdx, lapRows),
      avgLambda: columnStats(lambdaIdx, lapRows).avg,
      speedTrace: buildTrace(lapRows, speedIdx, distIdx, rpmIdx, lambdaIdx),
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
    maxLateralG: maxAbs(lateralIdx, rows),
    minLambda: overallLambda.min,
    maxLambda: overallLambda.max,
    avgLambda: overallLambda.avg,
    laps,
  };
}
