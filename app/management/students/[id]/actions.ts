"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireRole } from "@/lib/supabase/dal";
import { getStudentDegreeAudit } from "@/lib/academic/degree-audit";
import { getStudentProfileSummary } from "@/lib/academic/identity";
import { syncStudentMilestoneByCode } from "@/lib/academic/milestone-sync";
import {
  linkStudentProfile,
  provisionStudentAccount,
  setProfileStatus,
  PROFILE_STATUSES,
  type ProfileStatus,
} from "@/lib/management/accounts";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";
import type { PostgrestError } from "@supabase/supabase-js";

export interface SyncCourseworkFormState {
  error?: string;
  message?: string;
}

/**
 * Re-computes the degree audit server-side (never trusts a client-supplied
 * "satisfied" flag) and, only if coursework is genuinely satisfied per the
 * configured curriculum_requirements, syncs the existing COURSEWORK
 * milestone via syncStudentMilestoneByCode() — the same mechanism every
 * other workflow action in this app uses (Phase 7 GSC/ASRB reviews, Phase
 * 8D thesis retrofits). MS/MPhil and PhD templates use different codes
 * for this step ('COURSE_WORK' vs 'COURSEWORK' — confirmed by inspecting
 * the Phase 3 seed data, not assumed), so both are passed and whichever
 * applies to this student's track is used. No second coursework-status
 * mechanism is created; this is a deliberate, explicit action (a button),
 * never a side effect of merely viewing the page.
 */
export async function syncCourseworkMilestoneAction(
  studentId: string,
  // Required by useActionState's (state, payload) calling convention even
  // though this action has no form fields to read — see CourseworkSyncButton.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: SyncCourseworkFormState | undefined
): Promise<SyncCourseworkFormState> {
  await requireRole("management");
  if (!UUID_RE.test(studentId)) return { error: "Invalid student." };

  const audit = await getStudentDegreeAudit(studentId);
  if (!audit) return { error: "Could not compute the degree audit for this student." };

  if (!audit.satisfiesCourseworkRequirement) {
    return { error: "Coursework requirements are not yet satisfied according to the configured curriculum — nothing was synced." };
  }

  await syncStudentMilestoneByCode(studentId, ["COURSE_WORK", "COURSEWORK"], {
    status: "completed",
    completed_date: new Date().toISOString().slice(0, 10),
  });

  revalidatePath(`/management/students/${studentId}`);
  return { message: "Coursework milestone synced." };
}

export interface LinkAccountFormState {
  error?: string;
  message?: string;
}

const ACCOUNT_CONSTRAINT_MESSAGES: Record<string, string> = {
  students_profile_id_key: "That account is already linked to a different student record.",
};

/**
 * Links an existing, already-signed-up profile (role='student', no
 * students row pointing to it yet) to this student's master record.
 * True account creation is out of scope — see lib/management/accounts.ts.
 */
export async function linkStudentAccountAction(
  studentId: string,
  _prevState: LinkAccountFormState | undefined,
  formData: FormData
): Promise<LinkAccountFormState> {
  await requireRole("management");
  if (!UUID_RE.test(studentId)) return { error: "Invalid student." };

  const profileId = String(formData.get("profileId") ?? "").trim();
  if (!UUID_RE.test(profileId)) return { error: "Select an account to link." };

  const { error } = await linkStudentProfile(studentId, profileId);
  if (error) {
    if (error.code === "invalid_role") return { error: error.message };
    return { error: toUserMessage(error as PostgrestError, ACCOUNT_CONSTRAINT_MESSAGES) };
  }

  revalidatePath(`/management/students/${studentId}`);
  revalidatePath("/management/students");
  return { message: "Account linked." };
}

/**
 * Toggles profiles.status (application-level login gate) — not
 * students.status (academic standing), never conflated. Bind-and-submit
 * pattern, same convention as toggleStudentStatusAction.
 */
export async function toggleAccountStatusAction(studentId: string, profileId: string, nextStatus: ProfileStatus) {
  await requireRole("management");
  if (!UUID_RE.test(studentId) || !UUID_RE.test(profileId)) return;
  if (!(PROFILE_STATUSES as readonly string[]).includes(nextStatus)) return;

  await setProfileStatus(profileId, nextStatus);
  revalidatePath(`/management/students/${studentId}`);
}

export interface InviteAccountFormState {
  error?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Invites a new Supabase Auth account for a student with no linked
 * profile yet, via lib/management/accounts.ts's provisionStudentAccount()
 * (the only function in the app allowed to touch the service-role key).
 * The full name always comes from the student's own master record — never
 * from client input — so the invited profile can't be seeded with an
 * arbitrary name.
 */
export async function inviteStudentAccountAction(
  studentId: string,
  _prevState: InviteAccountFormState | undefined,
  formData: FormData
): Promise<InviteAccountFormState> {
  await requireRole("management");
  if (!UUID_RE.test(studentId)) return { error: "Invalid student." };

  const email = String(formData.get("email") ?? "").trim();
  if (!email || !EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const summary = await getStudentProfileSummary(studentId);
  if (!summary) return { error: "Could not load the student record." };

  const origin = (await headers()).get("origin");
  if (!origin) return { error: "Could not determine this server's URL. Try again." };

  const { error } = await provisionStudentAccount(studentId, email, summary.full_name, `${origin}/auth/confirm`);
  if (error) return { error: error.message };

  revalidatePath(`/management/students/${studentId}`);
  revalidatePath("/management/students");
  return { message: "Invitation sent." };
}
