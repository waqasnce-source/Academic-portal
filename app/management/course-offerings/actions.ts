"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  OFFERING_STATUSES,
  COURSE_OFFERING_FACULTY_ROLES,
  createCourseOffering,
  updateCourseOffering,
  assignFacultyToOffering,
  removeFacultyAssignment,
  getOfferingsForCourseInSemester,
  type OfferingStatus,
  type CourseOfferingFacultyRole,
} from "@/lib/management/course-offerings";
import { getCourseById } from "@/lib/management/courses";
import { searchEnrollableStudents, bulkEnrollStudents, type StudentPickerRow, type BulkEnrollOutcome } from "@/lib/management/enrollments";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  course_offerings_course_id_fkey: "Selected course could not be found.",
  course_offerings_semester_id_fkey: "Selected semester could not be found.",
  course_offerings_course_id_semester_id_section_key: "This course already has an offering with this section in this semester.",
  course_offerings_capacity_check: "Capacity must be a positive number.",
  course_offering_faculty_faculty_id_fkey: "Selected faculty member could not be found.",
  course_offering_faculty_course_offering_id_faculty_id_key: "This faculty member is already assigned to this offering.",
  uq_course_offering_faculty_one_primary: "This offering already has a primary instructor. End that assignment first, or assign this faculty member as a co-instructor instead.",
  course_offering_faculty_role_check: "Please choose a valid instructor role.",
};

export interface CourseOfferingFormState {
  error?: string;
  /** Set when the error is actually just an informational "this course already has an offering here" notice — the form re-shows itself with a "Create Anyway" confirm step rather than blocking outright (multiple sections of the same course in one semester are legitimate). */
  needsConfirmation?: boolean;
}

function parseOfferingInput(formData: FormData):
  | { course_id: string; semester_id: string; section: string; capacity: number | null; status: OfferingStatus }
  | { error: string } {
  const courseId = String(formData.get("course_id") ?? "").trim();
  if (!UUID_RE.test(courseId)) return { error: "Please select a course." };

  const semesterId = String(formData.get("semester_id") ?? "").trim();
  if (!UUID_RE.test(semesterId)) return { error: "Please select a semester." };

  const section = String(formData.get("section") ?? "").trim() || "A";
  if (section.length > 20) return { error: "Section must be 20 characters or fewer." };

  const rawCapacity = String(formData.get("capacity") ?? "").trim();
  let capacity: number | null = null;
  if (rawCapacity) {
    const parsed = Number.parseInt(rawCapacity, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return { error: "Capacity must be a positive whole number." };
    capacity = parsed;
  }

  const rawStatus = String(formData.get("status") ?? "").trim();
  const status = (OFFERING_STATUSES as readonly string[]).includes(rawStatus) ? (rawStatus as OfferingStatus) : "planned";

  return { course_id: courseId, semester_id: semesterId, section, capacity, status };
}

export async function createCourseOfferingAction(
  _prevState: CourseOfferingFormState | undefined,
  formData: FormData
): Promise<CourseOfferingFormState> {
  await requireRole("management");

  const parsed = parseOfferingInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  // Informational-only duplicate check: multiple sections of the same
  // course in one semester are legitimate (the DB's real uniqueness guard
  // is course+semester+section, not course+semester alone), so this never
  // hard-blocks — it just asks for a second, explicit confirmation before
  // creating what might be an accidental repeat.
  const confirmed = String(formData.get("confirmed") ?? "") === "true";
  if (!confirmed) {
    const existingOfferings = await getOfferingsForCourseInSemester(parsed.course_id, parsed.semester_id);
    if (existingOfferings.length > 0) {
      const course = await getCourseById(parsed.course_id);
      const sections = existingOfferings.map((o) => `Section ${o.section} (${o.status})`).join(", ");
      return {
        error: `${course?.code ?? "This course"} is already offered in this semester: ${sections}. Click "Create Anyway" to add another section.`,
        needsConfirmation: true,
      };
    }
  }

  const { error, data } = await createCourseOffering(parsed);
  if (error || !data) return { error: toUserMessage(error!, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/course-offerings");
  redirect(`/management/course-offerings/${data.id}`);
}

export async function updateCourseOfferingAction(
  id: string,
  _prevState: CourseOfferingFormState | undefined,
  formData: FormData
): Promise<CourseOfferingFormState> {
  await requireRole("management");
  if (!UUID_RE.test(id)) return { error: "Invalid course offering." };

  const parsed = parseOfferingInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await updateCourseOffering(id, parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/course-offerings");
  revalidatePath(`/management/course-offerings/${id}`);
  return {};
}

export async function assignFacultyAction(
  offeringId: string,
  _prevState: CourseOfferingFormState | undefined,
  formData: FormData
): Promise<CourseOfferingFormState> {
  await requireRole("management");
  if (!UUID_RE.test(offeringId)) return { error: "Invalid course offering." };

  const facultyId = String(formData.get("faculty_id") ?? "").trim();
  if (!UUID_RE.test(facultyId)) return { error: "Please select a faculty member." };

  const rawRole = String(formData.get("role") ?? "").trim();
  if (!(COURSE_OFFERING_FACULTY_ROLES as readonly string[]).includes(rawRole)) {
    return { error: "Please choose an instructor role." };
  }

  const { error } = await assignFacultyToOffering(offeringId, facultyId, rawRole as CourseOfferingFacultyRole);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath(`/management/course-offerings/${offeringId}`);
  revalidatePath("/management/course-offerings");
  return {};
}

/**
 * course_offering_faculty has no status/end_date column — ending an
 * assignment is a hard delete with no historical trace, a documented
 * limitation of the existing schema (see docs/database-design.md Phase
 * 8C addendum), not something this phase invents a workaround for.
 */
export async function removeFacultyAssignmentAction(offeringId: string, assignmentId: string) {
  await requireRole("management");
  if (!UUID_RE.test(offeringId) || !UUID_RE.test(assignmentId)) return;

  await removeFacultyAssignment(assignmentId);
  revalidatePath(`/management/course-offerings/${offeringId}`);
  revalidatePath("/management/course-offerings");
}

// ---- Bulk enrollment ("Manage Students" panel) ----

export async function searchEnrollableStudentsAction(offeringId: string, query: string): Promise<StudentPickerRow[]> {
  await requireRole("management");
  if (!UUID_RE.test(offeringId)) return [];
  return searchEnrollableStudents(offeringId, query);
}

export async function bulkEnrollStudentsAction(offeringId: string, studentIds: string[]): Promise<BulkEnrollOutcome> {
  await requireRole("management");
  if (!UUID_RE.test(offeringId)) return { enrolled: 0, failed: studentIds.map((studentId) => ({ studentId, error: "Invalid offering." })) };

  const validIds = studentIds.filter((id) => UUID_RE.test(id));
  const outcome = await bulkEnrollStudents(offeringId, validIds);

  revalidatePath(`/management/course-offerings/${offeringId}`);
  revalidatePath("/management/enrollments");
  revalidatePath("/management/academic-sessions");
  return outcome;
}
