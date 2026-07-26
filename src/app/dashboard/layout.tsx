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
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-zinc-900">
            <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-600 to-red-500" />
            Karting Log
          </Link>
          <div className="flex items-center gap-4 text-sm text-zinc-600">
            <span className="hidden sm:inline">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="font-medium text-zinc-600 transition-colors hover:text-red-600"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
