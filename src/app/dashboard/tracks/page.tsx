export default function TracksPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Tracks</h1>
      <p className="mt-1 text-sm text-neutral-400">A catalog of every track you&apos;ve raced or tested at.</p>

      <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900 px-6 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/10 text-red-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-6 w-6" aria-hidden>
            <path d="M4 20c0-6 3-10 8-10s6-6 12-6" />
          </svg>
        </span>
        <p className="font-semibold text-white">Coming soon</p>
        <p className="max-w-sm text-sm text-neutral-500">
          A searchable list of every track you&apos;ve logged, with location, layout length, and your
          personal best at each one, is on the way.
        </p>
      </div>
    </div>
  );
}
