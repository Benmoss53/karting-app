"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { TracePoint } from "@/lib/aim-csv";

// Validated (dark-mode, categorical, adjacent-pairlist) palette — see the
// dataviz skill. Fixed order, never cycled: at most 8 laps compared at once.
const PALETTE = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];

const MAX_VISIBLE = 8;
const WIDTH = 760;
const HEIGHT = 340;
const PAD = { top: 16, right: 16, bottom: 32, left: 48 };

type LapTrace = {
  lap: number;
  lapTime: string | null;
  speedTrace: TracePoint[];
};

function niceMax(value: number, step: number) {
  return Math.ceil(value / step) * step;
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
  const svgRef = useRef<SVGSVGElement>(null);

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
  const maxSpeed = niceMax(
    Math.max(1, ...lapsWithData.flatMap((lap) => lap.speedTrace.map((p) => p.speedKmh))),
    20,
  );

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const xScale = (d: number) => PAD.left + (d / maxDistance) * plotW;
  const yScale = (s: number) => PAD.top + plotH - (s / maxSpeed) * plotH;

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

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const distance = ((x - PAD.left) / plotW) * maxDistance;
    if (distance < 0 || distance > maxDistance) {
      setHoverDistance(null);
      return;
    }
    setHoverDistance(distance);
  }

  const yTicks = Array.from({ length: maxSpeed / 20 + 1 }, (_, i) => i * 20);
  const xTickStep = maxDistance > 600 ? 200 : 100;
  const xTicks = Array.from(
    { length: Math.floor(maxDistance / xTickStep) + 1 },
    (_, i) => i * xTickStep,
  );

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
      <p className="text-sm text-zinc-500">
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
                  : "bg-white/5 text-zinc-500 ring-1 ring-inset ring-white/10 hover:text-zinc-300"
              } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
              style={
                isVisible
                  ? { backgroundColor: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}55` }
                  : undefined
              }
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: isVisible ? color : "#71717a" }}
              />
              Lap {lap.lap}
            </button>
          );
        })}
      </div>
      {visible.size >= MAX_VISIBLE && (
        <p className="mb-3 text-xs text-zinc-500">
          Comparing {MAX_VISIBLE} laps at once (the most that stay clearly distinguishable).
          Deselect one to add another.
        </p>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverDistance(null)}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#2c2c2a"
              strokeWidth={1}
            />
            <text x={PAD.left - 8} y={yScale(tick)} textAnchor="end" dy="0.32em" fontSize={11} fill="#898781">
              {tick}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <text
            key={tick}
            x={xScale(tick)}
            y={HEIGHT - 10}
            textAnchor="middle"
            fontSize={11}
            fill="#898781"
          >
            {tick}m
          </text>
        ))}

        {visibleLaps.map((lap) => {
          const color = colorByLap.get(lap.lap)!;
          const d = lap.speedTrace
            .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.distanceM)} ${yScale(p.speedKmh)}`)
            .join(" ");
          const last = lap.speedTrace[lap.speedTrace.length - 1];
          return (
            <g key={lap.lap}>
              <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={xScale(last.distanceM)} cy={yScale(last.speedKmh)} r={4} fill={color} stroke="#18181b" strokeWidth={2} />
              <text
                x={xScale(last.distanceM) + 6}
                y={yScale(last.speedKmh)}
                fontSize={11}
                fill="#c3c2b7"
                dy="0.32em"
              >
                {lap.lap}
              </text>
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

      {hoverReadouts.length > 0 && (
        <div className="mt-2 rounded-lg border border-white/10 bg-zinc-950/80 p-3 text-xs">
          <p className="mb-1.5 font-mono text-zinc-400">
            {Math.round(hoverDistance ?? 0)}m into lap
          </p>
          <div className="flex flex-col gap-1">
            {hoverReadouts.map((r) => (
              <div key={r.lap} className="flex items-center gap-2">
                <span className="h-0.5 w-4" style={{ backgroundColor: r.color }} />
                <span className="text-zinc-400">Lap {r.lap}</span>
                <span className="font-mono font-semibold text-zinc-100">
                  {r.point!.speedKmh.toFixed(1)} km/h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
