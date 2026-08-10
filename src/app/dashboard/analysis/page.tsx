export default function AnalysisPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Analysis</h1>
      <p className="mt-1 text-sm text-neutral-400">Deeper trends across every session you&apos;ve logged.</p>

      <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900 px-6 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/10 text-red-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
            <path d="M4 20V10M12 20V4M20 20v-7" />
          </svg>
        </span>
        <p className="font-semibold text-white">Coming soon</p>
        <p className="max-w-sm text-sm text-neutral-500">
          Cross-session trends — best lap progression, telemetry comparisons, and setup-vs-pace
          insights — are on the way. For now, ask the AI Assistant (Home → AI Assistant) about
          patterns across your sessions.
        </p>
      </div>
    </div>
  );
}
