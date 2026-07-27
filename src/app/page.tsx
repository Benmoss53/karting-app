import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-8 h-14 w-14 rounded-2xl bg-blue-600 shadow-sm transition-transform duration-300 hover:scale-105" />

      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
        Track your karting setups and telemetry in one place
      </h1>
      <p className="mt-5 max-w-lg text-lg text-slate-600">
        Upload MyChron data, SmartyCam footage, and weekend setup notes for
        every session — all in one driver history.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.03] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white active:scale-[0.97]"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:scale-[1.03] hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white active:scale-[0.97]"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
