"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { TracePoint } from "@/lib/aim-csv";

// Validated (light-mode, categorical, adjacent-pairlist) palette — see the
// dataviz skill. Fixed order, never cycled: at most 8 laps compared at once.
const PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

const MAX_VISIBLE = 8;
const WIDTH = 760;
const CHART_HEIGHT = 170;
const PAD = { top: 12, right: 16, bottom: 26, left: 52 };

type LapTrace = {
  lap: number;
  lapTime: string | null;
  speedTrace: TracePoint[];
};

type Channel = {
  key: string;
  label: string;
  accessor: (p: TracePoint) => number | null;
  domain: { min: number; max: number };
  ticks: number[];
  formatTick: (v: number) => string;
  formatReadout: (v: number) => string;
  showEndLabel: boolean;
};

function niceMax(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

// Magnitude channels (speed, RPM) read most naturally from a zero baseline.
function zeroBasedDomain(values: number[], step: number) {
  if (values.length === 0) return { min: 0, max: step };
  return { min: 0, max: niceMax(Math.max(1, ...values), step) };
}

// Lambda hovers narrowly around 1.0 — a zero baseline would flatten it to an
// unreadable line, so scale to the observed range with a little padding.
function rangeDomain(values: number[]) {
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.15 || 0.05;
  return { min: min - pad, max: max + pad };
}

function evenTicks(min: number, max: number, count = 4) {
  return Array.from({ length: count + 1 }, (_, i) => min + ((max - min) * i) / count);
}

function findNearest(trace: TracePoint[], distanceM: number): TracePoint | null {
  if (trace.length === 0) return null;
  let lo = 0;
  let hi = trace.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (trace[mid].distanceM < distanceM) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0) {
    const prev = trace[lo - 1];
    const curr = trace[lo];
    if (Math.abs(prev.distanceM - distanceM) < Math.abs(curr.distanceM - distanceM)) {
      return prev;
    }
  }
  return trace[lo];
}

export default function SpeedDistanceChart({ laps }: { laps: LapTrace[] }) {
  const lapsWithData = useMemo(() => laps.filter((lap) => lap.speedTrace.length > 1), [laps]);

  const [visible, setVisible] = useState<Set<number>>(
    () => new Set(lapsWithData.slice(0, Math.min(3, lapsWithData.length)).map((l) => l.lap)),
  );
  const [hoverDistance, setHoverDistance] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleLaps = lapsWithData.filter((lap) => visible.has(lap.lap));
  const colorByLap = new Map(
    [...visible]
      .sort((a, b) => a - b)
      .map((lapNum, idx) => [lapNum, PALETTE[idx % PALETTE.length]]),
  );

  const maxDistance = Math.max(
    1,
    ...lapsWithData.flatMap((lap) => lap.speedTrace.map((p) => p.distanceM)),
  );

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;
  const xScale = (d: number) => PAD.left + (d / maxDistance) * plotW;

  function toggleLap(lapNum: number) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(lapNum)) {
        next.delete(lapNum);
      } else if (next.size < MAX_VISIBLE) {
        next.add(lapNum);
      }
      return next;
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const distance = ((x - PAD.left) / plotW) * maxDistance;
    if (distance < 0 || distance > maxDistance) {
      setHoverDistance(null);
      return;
    }
    setHoverDistance(distance);
  }

  const xTickStep = maxDistance > 600 ? 200 : 100;
  const xTicks = Array.from(
    { length: Math.floor(maxDistance / xTickStep) + 1 },
    (_, i) => i * xTickStep,
  );

  // Analyses stored before rpm/lambda were tracked simply lack the keys
  // (undefined, not null) — filter with `!= null` to catch both.
  const speedValues = lapsWithData.flatMap((lap) => lap.speedTrace.map((p) => p.speedKmh));
  const rpmValues = lapsWithData.flatMap((lap) =>
    lap.speedTrace.map((p) => p.rpm).filter((v): v is number => v != null),
  );
  const lambdaValues = lapsWithData.flatMap((lap) =>
    lap.speedTrace.map((p) => p.lambda).filter((v): v is number => v != null),
  );

  const speedDomain = zeroBasedDomain(speedValues, 20);
  const rpmDomain = zeroBasedDomain(rpmValues, 2000);
  const lambdaDomain = rangeDomain(lambdaValues);

  const channels: Channel[] = [
    {
      key: "speed",
      label: "Speed (km/h)",
      accessor: (p) => p.speedKmh,
      domain: speedDomain,
      ticks: evenTicks(speedDomain.min, speedDomain.max),
      formatTick: (v) => Math.round(v).toString(),
      formatReadout: (v) => `${v.toFixed(1)} km/h`,
      showEndLabel: true,
    },
    ...(rpmValues.length > 0
      ? [
          {
            key: "rpm",
            label: "RPM",
            accessor: (p: TracePoint) => p.rpm,
            domain: rpmDomain,
            ticks: evenTicks(rpmDomain.min, rpmDomain.max),
            formatTick: (v: number) => Math.round(v).toString(),
            formatReadout: (v: number) => `${Math.round(v)} rpm`,
            showEndLabel: false,
          },
        ]
      : []),
    ...(lambdaValues.length > 0
      ? [
          {
            key: "lambda",
            label: "Lambda",
            accessor: (p: TracePoint) => p.lambda,
            domain: lambdaDomain,
            ticks: evenTicks(lambdaDomain.min, lambdaDomain.max),
            formatTick: (v: number) => v.toFixed(2),
            formatReadout: (v: number) => `${v.toFixed(2)} λ`,
            showEndLabel: false,
          },
        ]
      : []),
  ];

  const hoverReadouts =
    hoverDistance === null
      ? []
      : visibleLaps
          .map((lap) => ({
            lap: lap.lap,
            lapTime: lap.lapTime,
            point: findNearest(lap.speedTrace, hoverDistance),
            color: colorByLap.get(lap.lap)!,
          }))
          .filter((r) => r.point !== null);

  if (lapsWithData.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No GPS distance/speed data available to chart for this file.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {lapsWithData.map((lap) => {
          const isVisible = visible.has(lap.lap);
          const color = colorByLap.get(lap.lap);
          const disabled = !isVisible && visible.size >= MAX_VISIBLE;
          return (
            <button
              key={lap.lap}
              type="button"
              disabled={disabled}
              onClick={() => toggleLap(lap.lap)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                isVisible
                  ? "ring-1 ring-inset"
                  : "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200 hover:text-slate-700"
              } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
              style={
                isVisible
                  ? { backgroundColor: `${color}1a`, color, boxShadow: `inset 0 0 0 1px ${color}55` }
                  : undefined
              }
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: isVisible ? color : "#94a3b8" }}
              />
              Lap {lap.lap}
            </button>
          );
        })}
      </div>
      {visible.size >= MAX_VISIBLE && (
        <p className="mb-3 text-xs text-slate-500">
          Comparing {MAX_VISIBLE} laps at once (the most that stay clearly distinguishable).
          Deselect one to add another.
        </p>
      )}

      <div
        ref={containerRef}
        className="touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverDistance(null)}
      >
        {channels.map((channel, channelIdx) => {
          const isLast = channelIdx === channels.length - 1;
          const span = channel.domain.max - channel.domain.min || 1;
          const yScale = (v: number) => PAD.top + plotH - ((v - channel.domain.min) / span) * plotH;

          return (
            <div key={channel.key} className={channelIdx > 0 ? "mt-1" : undefined}>
              <p className="mb-1 text-xs font-medium text-slate-500">{channel.label}</p>
              <svg viewBox={`0 0 ${WIDTH} ${CHART_HEIGHT}`} className="w-full">
                {channel.ticks.map((tick) => (
                  <g key={tick}>
                    <line
                      x1={PAD.left}
                      x2={WIDTH - PAD.right}
                      y1={yScale(tick)}
                      y2={yScale(tick)}
                      stroke="#e1e0d9"
                      strokeWidth={1}
                    />
                    <text
                      x={PAD.left - 8}
                      y={yScale(tick)}
                      textAnchor="end"
                      dy="0.32em"
                      fontSize={11}
                      fill="#898781"
                    >
                      {channel.formatTick(tick)}
                    </text>
                  </g>
                ))}
                {isLast &&
                  xTicks.map((tick) => (
                    <text
                      key={tick}
                      x={xScale(tick)}
                      y={CHART_HEIGHT - 8}
                      textAnchor="middle"
                      fontSize={11}
                      fill="#898781"
                    >
                      {tick}m
                    </text>
                  ))}

                {visibleLaps.map((lap) => {
                  const color = colorByLap.get(lap.lap)!;
                  const points = lap.speedTrace.filter((p) => channel.accessor(p) != null);
                  if (points.length === 0) return null;
                  const d = points
                    .map(
                      (p, i) =>
                        `${i === 0 ? "M" : "L"} ${xScale(p.distanceM)} ${yScale(channel.accessor(p)!)}`,
                    )
                    .join(" ");
                  const last = points[points.length - 1];
                  return (
                    <g key={lap.lap}>
                      <path
                        d={d}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <circle
                        cx={xScale(last.distanceM)}
                        cy={yScale(channel.accessor(last)!)}
                        r={4}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                      {channel.showEndLabel && (
                        <text
                          x={xScale(last.distanceM) + 6}
                          y={yScale(channel.accessor(last)!)}
                          fontSize={11}
                          fill="#52514e"
                          dy="0.32em"
                        >
                          {lap.lap}
                        </text>
                      )}
                    </g>
                  );
                })}

                {hoverDistance !== null && (
                  <line
                    x1={xScale(hoverDistance)}
                    x2={xScale(hoverDistance)}
                    y1={PAD.top}
                    y2={PAD.top + plotH}
                    stroke="#c3c2b7"
                    strokeWidth={1}
                  />
                )}
              </svg>
            </div>
          );
        })}
      </div>

      {hoverReadouts.length > 0 && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm">
          <p className="mb-1.5 font-mono text-slate-500">
            {Math.round(hoverDistance ?? 0)}m into lap
          </p>
          <div className="flex flex-col gap-1">
            {hoverReadouts.map((r) => (
              <div key={r.lap} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-2">
                  <span className="h-0.5 w-4" style={{ backgroundColor: r.color }} />
                  <span className="text-slate-500">Lap {r.lap}</span>
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {r.point!.speedKmh.toFixed(1)} km/h
                </span>
                {r.point!.rpm != null && (
                  <span className="font-mono text-slate-700">{Math.round(r.point!.rpm)} rpm</span>
                )}
                {r.point!.lambda != null && (
                  <span className="font-mono text-slate-700">{r.point!.lambda.toFixed(2)} λ</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
