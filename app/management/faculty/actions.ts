"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireRole } from "@/lib/supabase/dal";
import {
  FACULTY_STATUSES,
  createFaculty,
  updateFaculty,
  setFacultyStatus,
  getFacultyById,
  type FacultyStatus,
} from "@/lib/management/faculty";
import {
  linkFacultyProfile,
  provisionFacultyAccount,
  setProfileStatus,
  PROFILE_STATUSES,
  type ProfileStatus,
} from "@/lib/management/accounts";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";
import type { PostgrestError } from "@supabase/supabase-js";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  faculty_employee_number_key: "A faculty member with this employee number already exists.",
  faculty_department_id_fkey: "Selected department could not be found.",
  faculty_status_check: "Status must be Active or Inactive.",
};

export interface FacultyFormState {
  error?: string;
}

interface ParsedFacultyInput {
  employee_number: string | null;
  name: string;
  email: string | null;
  designation: string;
  department_id: string | null;
  status: FacultyStatus;
  joined_date: string | null;
}

function parseFacultyInput(formData: FormData): ParsedFacultyInput | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const rawEmployeeNumber = String(formData.get("employee_number") ?? "").trim();
  const rawEmail = String(formData.get("email") ?? "").trim();
  const rawDepartmentId = String(formData.get("department_id") ?? "").trim();
  const rawJoinedDate = String(formData.get("joined_date") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "").trim();

  if (!name) return { error: "Name is required." };
  if (name.length > 200) return { error: "Name must be 200 characters or fewer." };
  if (!designation) return { error: "Designation is required." };
  if (designation.length > 200) return { error: "Designation must be 200 characters or fewer." };
  if (rawEmployeeNumber.length > 50) return { error: "Employee number must be 50 characters or fewer." };
  if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) return { error: "Email is not valid." };
  if (rawDepartmentId && !UUID_RE.test(rawDepartmentId)) return { error: "Invalid department." };
  if (!(FACULTY_STATUSES as readonly string[]).includes(rawStatus)) {
    return { error: "Status must be Active or Inactive." };
  }

  return {
    employee_number: rawEmployeeNumber || null,
    name,
    email: rawEmail || null,
    designation,
    department_id: rawDepartmentId || null,
    status: rawStatus as FacultyStatus,
    joined_date: rawJoinedDate || null,
  };
}

export async function createFacultyAction(
  _prevState: FacultyFormState | undefined,
  formData: FormData
): Promise<FacultyFormState> {
  await requireRole("management");

  const parsed = parseFacultyInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await createFaculty(parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/faculty");
  redirect("/management/faculty");
}

export async function updateFacultyAction(
  id: string,
  _prevState: FacultyFormState | undefined,
  formData: FormData
): Promise<FacultyFormState> {
  await requireRole("management");

  if (!UUID_RE.test(id)) return { error: "Invalid faculty record." };

  const parsed = parseFacultyInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await updateFaculty(id, parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/faculty");
  redirect("/management/faculty");
}

export async function toggleFacultyStatusAction(id: string, nextStatus: FacultyStatus) {
  await requireRole("management");
  if (!UUID_RE.test(id)) return;
  if (!(FACULTY_STATUSES as readonly string[]).includes(nextStatus)) return;

  await setFacultyStatus(id, nextStatus);
  revalidatePath("/management/faculty");
}

export interface LinkAccountFormState {
  error?: string;
  message?: string;
}

const ACCOUNT_CONSTRAINT_MESSAGES: Record<string, string> = {
  faculty_profile_id_key: "That account is already linked to a different faculty record.",
};

/** Links an existing, already-signed-up profile (role='faculty') to this faculty master record. See lib/management/accounts.ts. */
export async function linkFacultyAccountAction(
  facultyId: string,
  _prevState: LinkAccountFormState | undefined,
  formData: FormData
): Promise<LinkAccountFormState> {
  await requireRole("management");
  if (!UUID_RE.test(facultyId)) return { error: "Invalid faculty record." };

  const profileId = String(formData.get("profileId") ?? "").trim();
  if (!UUID_RE.test(profileId)) return { error: "Select an account to link." };

  const { error } = await linkFacultyProfile(facultyId, profileId);
  if (error) {
    if (error.code === "invalid_role") return { error: error.message };
    return { error: toUserMessage(error as PostgrestError, ACCOUNT_CONSTRAINT_MESSAGES) };
  }

  revalidatePath(`/management/faculty/${facultyId}/edit`);
  revalidatePath("/management/faculty");
  return { message: "Account linked." };
}

/** Toggles profiles.status (application-level login gate) — not faculty.status (employment status), never conflated. */
export async function toggleAccountStatusAction(facultyId: string, profileId: string, nextStatus: ProfileStatus) {
  await requireRole("management");
  if (!UUID_RE.test(facultyId) || !UUID_RE.test(profileId)) return;
  if (!(PROFILE_STATUSES as readonly string[]).includes(nextStatus)) return;

  await setProfileStatus(profileId, nextStatus);
  revalidatePath(`/management/faculty/${facultyId}/edit`);
}

export interface InviteAccountFormState {
  error?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Invites a new Supabase Auth account for a faculty member with no linked
 * profile yet. See lib/management/accounts.ts's provisionFacultyAccount()
 * and app/management/students/[id]/actions.ts's inviteStudentAccountAction
 * for the identical student-side counterpart.
 */
export async function inviteFacultyAccountAction(
  facultyId: string,
  _prevState: InviteAccountFormState | undefined,
  formData: FormData
): Promise<InviteAccountFormState> {
  await requireRole("management");
  if (!UUID_RE.test(facultyId)) return { error: "Invalid faculty record." };

  const email = String(formData.get("email") ?? "").trim();
  if (!email || !EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const faculty = await getFacultyById(facultyId);
  if (!faculty) return { error: "Could not load the faculty record." };

  const origin = (await headers()).get("origin");
  if (!origin) return { error: "Could not determine this server's URL. Try again." };

  const { error } = await provisionFacultyAccount(facultyId, email, faculty.name, `${origin}/auth/confirm`);
  if (error) return { error: error.message };

  revalidatePath(`/management/faculty/${facultyId}/edit`);
  revalidatePath("/management/faculty");
  return { message: "Invitation sent." };
}
