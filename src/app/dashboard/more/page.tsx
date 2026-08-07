import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthedUser } from "@/lib/supabase/user";
import { signOut } from "@/app/login/actions";

export default async function MorePage() {
  const user = await getAuthedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: driver } = await supabase
    .from("drivers")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">More</h1>
        <p className="mt-1 text-sm text-neutral-400">Account and app settings.</p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-neutral-700 text-neutral-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{driver?.full_name || "Driver"}</p>
          <p className="truncate font-mono text-sm text-neutral-500">{user.email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard/new"
          className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-4 text-sm font-medium text-white transition-colors hover:border-neutral-700"
        >
          Add a session
          <span className="text-neutral-600">→</span>
        </Link>

        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-4 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-600/5"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
