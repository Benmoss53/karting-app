import Link from "next/link";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Log in</h1>

        {params.message && (
          <p className="mb-4 rounded bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {params.message}
          </p>
        )}
        {params.error && (
          <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
            {params.error}
          </p>
        )}

        <form action={signIn} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
          >
            Log in
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
