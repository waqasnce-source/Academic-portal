import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Server Functions, and Route
 * Handlers. Reads/writes the session via Next.js cookies(), which is async
 * as of Next.js 15+. Server Components can only read cookies, so a
 * `setAll` failure there is expected and safe to ignore as long as
 * middleware is refreshing the session (to be added when auth is
 * implemented).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — ignore; session refresh
            // will be handled by middleware once auth is implemented.
          }
        },
      },
    }
  );
}
