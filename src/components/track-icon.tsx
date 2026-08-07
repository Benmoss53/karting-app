// Decorative track-outline glyph shown on each session card. We don't have
// real per-track layout data, so this renders one of a few generic circuit
// squiggles, picked deterministically from the track name so a given track
// always gets the same glyph without needing real geometry.
const PATHS = [
  "M4 20c0-6 3-10 8-10s6-6 12-6",
  "M3 8c4-4 10-4 12 0s7 2 9-2",
  "M4 6c6 0 4 8 10 8s2-8 8-8",
  "M3 14c0-5 5-9 10-6s9 1 10-5",
];

function pickPath(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PATHS[hash % PATHS.length];
}

export default function TrackIcon({ seed, className = "" }: { seed: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d={pickPath(seed)} />
    </svg>
  );
}
