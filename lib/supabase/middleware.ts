import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes reachable without an authenticated session. Everything else is
 * protected by default (fail closed) so a new route added later is
 * automatically guarded instead of silently public.
 *
 * /auth/confirm must be public: it's the landing point for Supabase's
 * invite email link, reached by a browser with no session cookie yet —
 * its own verifyOtp() call is what establishes the session. Everything
 * downstream of it (/auth/set-password) is intentionally NOT public, since
 * by the time the browser gets there verifyOtp() has already set the
 * session cookie.
 */
const PUBLIC_PATHS = new Set(["/", "/login", "/auth/confirm"]);

/**
 * Refreshes the Supabase session cookie on every request (per the
 * @supabase/ssr Next.js pattern) and performs an *optimistic* auth redirect
 * based on the verified session only. This intentionally does not resolve
 * `profiles.role` here — Proxy runs on every request, including
 * prefetches, and Next.js's own guidance is to avoid database reads in
 * Proxy. Role-based authorization happens server-side, close to the data,
 * via requireRole() in lib/supabase/dal.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not add logic between createServerClient and getUser(): getUser()
  // is what actually revalidates the token against Supabase Auth and
  // refreshes the session cookie via setAll above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.has(path);

  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
