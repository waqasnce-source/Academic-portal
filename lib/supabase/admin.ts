import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client using SUPABASE_SERVICE_ROLE_KEY — bypasses RLS
 * entirely via the Auth Admin API (auth.admin.*). This is the ONLY module
 * in the app allowed to touch that key. The "server-only" import makes any
 * accidental Client Component import of this file fail the build, and
 * nothing here reads NEXT_PUBLIC_* for the key (a real secret must never
 * carry that prefix). Session persistence is disabled since this client is
 * created fresh per privileged call, never tied to a browser session.
 *
 * Every caller of createAdminClient() must have already independently
 * verified the caller is management (requireRole("management")) before
 * invoking it — the Admin API itself enforces nothing about who is allowed
 * to call it from our server, since the service-role key bypasses RLS by
 * design. This client must never be returned to, or constructed from,
 * anything reachable by a Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured on this server. Account provisioning is unavailable until it is set — see docs/database-design.md §21."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
