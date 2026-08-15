"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  EXTENSION_APPLICATION_STATUSES,
  createExtensionApplication,
  getExtensionApplicationById,
  reviewExtensionApplication,
  type ExtensionApplicationStatus,
} from "@/lib/management/extensions";
import { notifyIfLinked } from "@/lib/management/notifications";
import { getStudentById } from "@/lib/management/students";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  extension_applications_student_id_fkey: "Selected student could not be found.",
  extension_applications_status_check: "Invalid status value.",
};

export interface ExtensionFormState {
  error?: string;
}

function parseCreateInput(formData: FormData):
  | {
      student_id: string;
      application_date: string;
      current_semester: number | null;
      requested_extension_semesters: number | null;
      requested_from: string | null;
      requested_to: string | null;
      reason: string | null;
    }
  | { error: string } {
  const studentId = String(formData.get("student_id") ?? "").trim();
  const applicationDate = String(formData.get("application_date") ?? "").trim();
  const rawCurrentSemester = String(formData.get("current_semester") ?? "").trim();
  const rawRequestedSemesters = String(formData.get("requested_extension_semesters") ?? "").trim();
  const requestedFrom = String(formData.get("requested_from") ?? "").trim();
  const requestedTo = String(formData.get("requested_to") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!UUID_RE.test(studentId)) return { error: "Please select a student." };
  if (!applicationDate) return { error: "Application date is required." };
  if (reason.length > 2000) return { error: "Reason must be 2000 characters or fewer." };
  if (requestedFrom && requestedTo && requestedTo < requestedFrom) {
    return { error: "Requested end date must be on or after the start date." };
  }

  const currentSemester = rawCurrentSemester ? Number(rawCurrentSemester) : null;
  if (currentSemester !== null && (!Number.isFinite(currentSemester) || currentSemester <= 0)) {
    return { error: "Current semester must be a positive number." };
  }
  const requestedSemesters = rawRequestedSemesters ? Number(rawRequestedSemesters) : null;
  if (requestedSemesters !== null && (!Number.isFinite(requestedSemesters) || requestedSemesters <= 0)) {
    return { error: "Requested extension semesters must be a positive number." };
  }

  return {
    student_id: studentId,
    application_date: applicationDate,
    current_semester: currentSemester,
    requested_extension_semesters: requestedSemesters,
    requested_from: requestedFrom || null,
    requested_to: requestedTo || null,
    reason: reason || null,
  };
}

export async function createExtensionApplicationAction(
  _prevState: ExtensionFormState | undefined,
  formData: FormData
): Promise<ExtensionFormState> {
  await requireRole("management");

  const parsed = parseCreateInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await createExtensionApplication(parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/extensions");
  redirect("/management/extensions");
}

export async function reviewExtensionApplicationAction(
  applicationId: string,
  _prevState: ExtensionFormState | undefined,
  formData: FormData
): Promise<ExtensionFormState> {
  await requireRole("management");

  if (!UUID_RE.test(applicationId)) return { error: "Invalid application." };

  const existing = await getExtensionApplicationById(applicationId);
  if (!existing) return { error: "Application not found." };
  if (existing.status === "approved" || existing.status === "rejected") {
    return { error: "This application has already received a final decision and cannot be changed. Record a new application instead." };
  }

  const rawStatus = String(formData.get("status") ?? "").trim();
  if (!(EXTENSION_APPLICATION_STATUSES as readonly string[]).includes(rawStatus)) {
    return { error: "Invalid status value." };
  }

  const rawRecommendation = String(formData.get("recommendation") ?? "").trim();
  const rawRemarks = String(formData.get("remarks") ?? "").trim();
  if (rawRecommendation.length > 2000 || rawRemarks.length > 2000) {
    return { error: "Recommendation/remarks must be 2000 characters or fewer." };
  }

  const { error } = await reviewExtensionApplication(applicationId, {
    status: rawStatus as ExtensionApplicationStatus,
    recommendation: rawRecommendation || null,
    remarks: rawRemarks || null,
  });

  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  // extension_applications.status is its own 5-value vocabulary (draft/
  // submitted/under_review/approved/rejected) distinct from the shared
  // 11-value student_milestones vocabulary, and getStudentAcademicStatus()
  // already reads extension_applications directly (findActiveExtension) —
  // no milestone-sync is needed here, only the notification.
  const student = await getStudentById(existing.student_id);
  await notifyIfLinked(
    student?.profile_id ?? null,
    "Extension Application Update",
    `Your extension application status has been updated to "${rawStatus.replace(/_/g, " ")}".`
  );

  revalidatePath("/management/extensions");
  revalidatePath(`/management/extensions/${applicationId}`);
  redirect("/management/extensions");
}
