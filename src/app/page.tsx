import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-red-500 shadow-lg shadow-blue-600/20" />

      <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
        Track your karting setups and telemetry in one place
      </h1>
      <p className="mt-4 max-w-md text-lg text-zinc-600">
        Upload MyChron data, SmartyCam footage, and weekend setup notes for
        every session — all in one driver history.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
