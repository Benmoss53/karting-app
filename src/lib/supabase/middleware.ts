import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps a driver's login session valid across page navigations.
// Called from src/proxy.ts on every request.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the auth token if it's expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Local-dev convenience: if DEV_AUTO_LOGIN_EMAIL/PASSWORD are set in
  // .env.local, silently sign in as that driver whenever there's no active
  // session, so `npm run dev` never bounces you to the login form. These
  // vars only ever live in .env.local (gitignored, never deployed to
  // Vercel), so the real deployed app still requires a normal login.
  if (
    !user &&
    process.env.DEV_AUTO_LOGIN_EMAIL &&
    process.env.DEV_AUTO_LOGIN_PASSWORD
  ) {
    await supabase.auth.signInWithPassword({
      email: process.env.DEV_AUTO_LOGIN_EMAIL,
      password: process.env.DEV_AUTO_LOGIN_PASSWORD,
    });
  }

  return response;
}
