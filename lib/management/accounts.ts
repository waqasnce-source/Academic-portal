import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROFILE_STATUSES, type ProfileStatus } from "./status-enums";

export { PROFILE_STATUSES, type ProfileStatus };

/**
 * Account/Identity Integration. Phase 8F covered what's safely buildable
 * without the Supabase Admin API: reading identity state, linking an
 * already-signed-up (but unlinked) profile, and toggling profiles.status.
 * Phase 9 adds true account provisioning (invite-by-email) via
 * lib/supabase/admin.ts, the sole module allowed to hold
 * SUPABASE_SERVICE_ROLE_KEY. Every function below that touches the admin
 * client is called only from a Server Action that has already run
 * requireRole("management") — the admin client bypasses RLS entirely, so
 * that check is the only thing standing between "management" and
 * "anyone with a session."
 */

export interface LinkedAccountInfo {
  profileId: string;
  fullName: string;
  email: string;
  status: ProfileStatus;
}

export interface UnlinkedProfileOption {
  id: string;
  full_name: string;
  email: string;
}

/**
 * Every profile with the given role that no students/faculty row currently
 * points to — the candidate list for the "link existing account" picker.
 * Two separate queries (rather than a single not-in subquery against a
 * union) because students.profile_id and faculty.profile_id are different
 * columns on different tables.
 */
export async function getUnlinkedProfiles(role: "student" | "faculty"): Promise<UnlinkedProfileOption[]> {
  const supabase = await createClient();

  const linkedTable = role === "student" ? "students" : "faculty";
  const { data: linkedRows, error: linkedError } = await supabase
    .from(linkedTable)
    .select("profile_id")
    .not("profile_id", "is", null);

  if (linkedError) {
    console.error("getUnlinkedProfiles linked-lookup failed:", linkedError);
    return [];
  }

  const linkedIds = (linkedRows ?? []).map((r) => (r as { profile_id: string }).profile_id);

  let query = supabase.from("profiles").select("id, full_name, email").eq("role", role).order("full_name");
  if (linkedIds.length > 0) {
    query = query.not("id", "in", `(${linkedIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getUnlinkedProfiles failed:", error);
    return [];
  }
  return (data ?? []) as UnlinkedProfileOption[];
}

/**
 * Current linkage state for one student/faculty master record.
 * Returns null if the master record has no profile_id set (not linked).
 */
export async function getLinkedAccountInfo(
  kind: "student" | "faculty",
  masterId: string
): Promise<LinkedAccountInfo | null> {
  const supabase = await createClient();
  const table = kind === "student" ? "students" : "faculty";
  const { data, error } = await supabase
    .from(table)
    .select("profile:profiles ( id, full_name, email, status )")
    .eq("id", masterId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("getLinkedAccountInfo failed:", error);
    return null;
  }

  const profile = (data as unknown as { profile: { id: string; full_name: string; email: string; status: ProfileStatus } | null })
    .profile;
  if (!profile) return null;

  return { profileId: profile.id, fullName: profile.full_name, email: profile.email, status: profile.status };
}

/**
 * Links an existing, unlinked profile to a student master record.
 * students.profile_id is UNIQUE, so a profile already linked to another
 * student is rejected by the database regardless of this pre-check — the
 * pre-check exists only to give a clearer error than a raw 23505.
 */
export async function linkStudentProfile(studentId: string, profileId: string) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) return { error: profileError };
  if (!profile || profile.role !== "student") {
    return { error: { message: "Selected account is not a student profile.", code: "invalid_role" } };
  }

  return supabase.from("students").update({ profile_id: profileId }).eq("id", studentId);
}

export async function linkFacultyProfile(facultyId: string, profileId: string) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) return { error: profileError };
  if (!profile || profile.role !== "faculty") {
    return { error: { message: "Selected account is not a faculty profile.", code: "invalid_role" } };
  }

  return supabase.from("faculty").update({ profile_id: profileId }).eq("id", facultyId);
}

/**
 * Application-level login gate, not academic/employment status.
 * `profiles_update_authenticated` RLS (`has_role('management') OR id =
 * auth.uid()`) is the actual enforcement; every caller of this helper is
 * itself a management Server Action.
 */
export async function setProfileStatus(profileId: string, status: ProfileStatus) {
  const supabase = await createClient();
  return supabase.from("profiles").update({ status }).eq("id", profileId);
}

export interface ProvisionResult {
  error?: { message: string; code?: string };
  profileId?: string;
}

export interface AuthConfirmationState {
  /** null means "could not be determined" (e.g. admin client unavailable) — distinct from false. */
  emailConfirmed: boolean;
  invitedAt: string | null;
}

/**
 * profiles.status ('active'/'inactive'/'suspended') is the application
 * login gate and is set at creation time — it does not represent whether
 * the person has actually opened the invite email and set a password yet.
 * That is a genuinely different concept (Supabase Auth's own
 * email_confirmed_at), read live from the Admin API rather than mirrored
 * into a new profiles column, so the two can never drift out of sync.
 * Returns null (not a thrown error) when the admin client isn't
 * configured or the lookup fails, so a page rendering this can degrade to
 * "unknown" instead of crashing.
 */
export async function getAuthConfirmationState(profileId: string): Promise<AuthConfirmationState | null> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const { data, error } = await admin.auth.admin.getUserById(profileId);
  if (error || !data?.user) return null;

  return {
    emailConfirmed: Boolean(data.user.email_confirmed_at),
    invitedAt: data.user.invited_at ?? null,
  };
}

function mapInviteError(error: { code?: string; message: string } | null): string {
  if (error?.code === "email_exists") {
    return "An authentication account with this email already exists. If it belongs to this person, use \"Link Existing Account\" instead — a matching portal profile was not found for it, which needs manual review before it can be linked safely.";
  }
  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return "Too many invitation emails have been sent recently. Wait a while and try again.";
  }
  console.error("Account provisioning invite failed:", error);
  return "Could not send the invitation. Please try again.";
}

/**
 * Shared invite-and-link orchestration for both roles (student/faculty
 * differ only in which table/column). Order matters for the rollback to
 * be correct: create the Auth user, then the profile, then the link —
 * each step's failure rolls back everything created so far by deleting
 * the Auth user (profiles.id references auth.users(id) on delete cascade,
 * so deleting the Auth user also removes the profile row; nothing yet
 * references the profile at that point, so no FK-restrict conflict).
 *
 * Case B (already linked) and Case D (email belongs to an existing
 * portal profile) are pre-checked here for a clear message; Case D for an
 * Auth user that exists with NO portal profile is left to the Admin
 * API's own "email_exists" rejection and reported to management as a
 * limitation (see mapInviteError) rather than auto-resolved — matching an
 * email string alone is not a safe basis for silently attaching someone
 * else's existing identity to this record.
 */
async function provisionAccount(
  kind: "student" | "faculty",
  masterId: string,
  email: string,
  fullName: string,
  redirectTo: string
): Promise<ProvisionResult> {
  const table = kind === "student" ? "students" : "faculty";
  const supabase = await createClient();

  const { data: master, error: masterError } = await supabase
    .from(table)
    .select("profile_id")
    .eq("id", masterId)
    .maybeSingle();
  if (masterError) return { error: { message: "Could not load the record." } };
  if (!master) return { error: { message: "Record not found." } };
  if (master.profile_id) return { error: { message: "This record is already linked to an account." } };

  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", normalizedEmail)
    .maybeSingle();
  if (existingProfile) {
    return {
      error: {
        message:
          'An account with this email already exists in the portal. Use "Link Existing Account" instead of inviting a new one.',
      },
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error: {
        message: "Account provisioning is not configured on this server (missing service-role credential).",
        code: "not_configured",
      },
    };
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: { role: kind, full_name: fullName },
    redirectTo,
  });
  if (inviteError || !invited?.user) {
    return { error: { message: mapInviteError(inviteError) } };
  }

  const authUserId = invited.user.id;

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: authUserId, role: kind, full_name: fullName, email: normalizedEmail, status: "active" });
  if (profileError) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    return {
      error: { message: "Invited the account but could not create its profile — the invitation was rolled back. Try again." },
    };
  }

  const { error: linkError } =
    kind === "student" ? await linkStudentProfile(masterId, authUserId) : await linkFacultyProfile(masterId, authUserId);
  if (linkError) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    return {
      error: { message: "Invited the account but could not link it to the record — the invitation was rolled back. Try again." },
    };
  }

  return { profileId: authUserId };
}

export async function provisionStudentAccount(
  studentId: string,
  email: string,
  fullName: string,
  redirectTo: string
): Promise<ProvisionResult> {
  return provisionAccount("student", studentId, email, fullName, redirectTo);
}

export async function provisionFacultyAccount(
  facultyId: string,
  email: string,
  fullName: string,
  redirectTo: string
): Promise<ProvisionResult> {
  return provisionAccount("faculty", facultyId, email, fullName, redirectTo);
}
