import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight">
        Track your karting setups and telemetry in one place
      </h1>
      <p className="mt-4 max-w-md text-zinc-600">
        Upload MyChron data, SmartyCam footage, and weekend setup notes for
        every session — all in one driver history.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/signup"
          className="rounded bg-black px-5 py-2.5 text-white hover:bg-zinc-800"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded border border-zinc-300 px-5 py-2.5 hover:bg-zinc-50"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
