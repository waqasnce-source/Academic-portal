"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/dal";
import { setNotificationRead } from "@/lib/management/notifications";
import { UUID_RE } from "@/lib/management/query-params";

/**
 * Shared across every role's dashboard (student, faculty) — a notification
 * belongs to a profile, not a role, and `notifications_self_update` RLS
 * (`profile_id = auth.uid() OR management`) is the actual ownership
 * boundary regardless of who's calling. `requireProfile()` only ensures an
 * active, authenticated caller; it does not itself check ownership.
 */
export async function markNotificationReadAction(path: string, id: string): Promise<void> {
  await requireProfile();
  if (!UUID_RE.test(id)) return;

  const { error } = await setNotificationRead(id, true);
  if (error) {
    console.error("markNotificationReadAction failed:", error);
    return;
  }
  revalidatePath(path);
}
