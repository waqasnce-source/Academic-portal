"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  ENROLLMENT_STATUSES,
  updateEnrollmentStatus,
  getEnrollmentById,
  enrollStudentInOffering,
  type EnrollmentStatus,
} from "@/lib/management/enrollments";
import { getStudentById } from "@/lib/management/students";
import { notifyIfLinked } from "@/lib/management/notifications";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  enrollments_student_id_fkey: "Selected student could not be found.",
  enrollments_course_offering_id_fkey: "Selected course offering could not be found.",
  uq_enrollments_active_student_offering: "This student already has an active enrollment in this course offering.",
  enrollments_status_check: "Please choose a valid enrollment status.",
};

export interface EnrollmentFormState {
  error?: string;
}

export async function createEnrollmentAction(
  _prevState: EnrollmentFormState | undefined,
  formData: FormData
): Promise<EnrollmentFormState> {
  await requireRole("management");

  const studentId = String(formData.get("student_id") ?? "").trim();
  if (!UUID_RE.test(studentId)) return { error: "Please select a student." };

  const courseOfferingId = String(formData.get("course_offering_id") ?? "").trim();
  if (!UUID_RE.test(courseOfferingId)) return { error: "Please select a course offering." };

  const result = await enrollStudentInOffering(studentId, courseOfferingId);
  if (!result.success) return { error: result.error };

  revalidatePath("/management/enrollments");
  redirect("/management/enrollments");
}

export async function updateEnrollmentStatusAction(
  id: string,
  _prevState: EnrollmentFormState | undefined,
  formData: FormData
): Promise<EnrollmentFormState> {
  await requireRole("management");
  if (!UUID_RE.test(id)) return { error: "Invalid enrollment." };

  const rawStatus = String(formData.get("status") ?? "").trim();
  if (!(ENROLLMENT_STATUSES as readonly string[]).includes(rawStatus)) {
    return { error: "Please choose a valid status." };
  }
  const status = rawStatus as EnrollmentStatus;

  const existing = await getEnrollmentById(id);
  if (!existing) return { error: "Enrollment not found." };

  const { error } = await updateEnrollmentStatus(id, status);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  const student = await getStudentById(existing.student.id);
  await notifyIfLinked(
    student?.profile_id ?? null,
    "Enrollment Status Update",
    `Your enrollment in ${existing.course_offering.course.code} — ${existing.course_offering.course.name} is now "${status}".`
  );

  revalidatePath("/management/enrollments");
  revalidatePath(`/management/enrollments/${id}`);
  return {};
}
