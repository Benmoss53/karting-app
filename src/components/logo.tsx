// Wordmark used in the dashboard header — a small checkered-flag glyph next
// to a two-tone "KARTING LOG" mark (white + red, matching the app's single
// accent color).
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden>
        <rect x="1" y="1" width="10" height="10" fill="currentColor" />
        <rect x="13" y="1" width="10" height="10" fill="currentColor" className="text-red-600" />
        <rect x="1" y="13" width="10" height="10" fill="currentColor" className="text-red-600" />
        <rect x="13" y="13" width="10" height="10" fill="currentColor" />
      </svg>
      <span className="text-lg font-extrabold italic tracking-tight text-white">
        KARTING <span className="text-red-600">LOG</span>
      </span>
    </span>
  );
}
