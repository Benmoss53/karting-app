import Link from "next/link";
import { signUp } from "@/app/login/actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="inline-block">
          <div className="mx-auto mb-6 h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-red-500 shadow-md shadow-blue-600/20" />
        </Link>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900">
          Sign up
        </h1>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-sm">
          {params.error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {params.error}
            </p>
          )}

          <form action={signUp} className="flex flex-col gap-4">
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-zinc-700">
                Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign up
            </button>
          </form>
        </div>

        <p className="mt-6 text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
