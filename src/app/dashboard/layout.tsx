import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-white/10 bg-zinc-950/70 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-zinc-50">
            <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-red-500 shadow-[0_0_16px_-4px_rgba(37,99,235,0.8)]" />
            Karting Log
          </Link>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span className="hidden font-mono sm:inline">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="font-medium text-zinc-400 transition-colors hover:text-red-400"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
