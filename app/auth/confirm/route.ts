import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side landing point for Supabase's invite email link. Supabase
 * redirects the browser here with `token_hash`+`type` query params after
 * the user clicks the emailed link; verifyOtp() exchanges that token for a
 * real session (setting cookies via the server client), then this route
 * sends them on to set a password. Only `type=invite` is accepted — this
 * app has no self-signup, password-recovery, or magic-link flow to
 * support, so accepting other Supabase-standard types here would silently
 * open flows this app never built UI for.
 *
 * Must be listed in lib/supabase/middleware.ts's PUBLIC_PATHS: the browser
 * arrives here with no session cookie yet, so the default "redirect
 * unauthenticated requests to /login" behavior would otherwise intercept
 * this request before verifyOtp() ever runs.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/auth/set-password";

  if (tokenHash && type === "invite") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invite_link_invalid`);
}
