import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-8 h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-red-500 shadow-[0_0_40px_-6px_rgba(37,99,235,0.6)] transition-transform duration-300 hover:scale-105" />

      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
        Track your karting setups and telemetry in one place
      </h1>
      <p className="mt-5 max-w-lg text-lg text-zinc-400">
        Upload MyChron data, SmartyCam footage, and weekend setup notes for
        every session — all in one driver history.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(37,99,235,0.7)] transition-all duration-200 hover:scale-[1.03] hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black active:scale-[0.97]"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-100 backdrop-blur-sm transition-all duration-200 hover:scale-[1.03] hover:border-white/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black active:scale-[0.97]"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
