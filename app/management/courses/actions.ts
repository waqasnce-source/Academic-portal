"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  COURSE_STATUSES,
  createCourse,
  updateCourse,
  setCourseStatus,
  findCourseByCode,
  type CourseStatus,
} from "@/lib/management/courses";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

/**
 * courses.code is unique (courses_code_key); courses.name is NOT unique per
 * the schema (supabase/migrations/20260812000000_initial_academic_portal_schema.sql:191-192)
 * — unlike departments, only code carries a uniqueness constraint here.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  courses_code_key: "A course with this code already exists.",
  courses_department_id_fkey: "Selected department could not be found.",
  courses_credit_hours_check: "Credit hours must be greater than 0.",
  courses_status_check: "Status must be Active or Inactive.",
};

export interface CourseFormState {
  error?: string;
  /** Set only when the error is "a course with this code already exists" — lets the form link straight to it instead of just showing text. */
  duplicateCourseId?: string;
}

interface ParsedCourseInput {
  department_id: string;
  code: string;
  name: string;
  credit_hours: number;
  status: CourseStatus;
}

function parseCourseInput(formData: FormData): ParsedCourseInput | { error: string } {
  const departmentId = String(formData.get("department_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rawCreditHours = String(formData.get("credit_hours") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "").trim();

  if (!UUID_RE.test(departmentId)) return { error: "Please select a department." };
  if (!code) return { error: "Code is required." };
  if (code.length > 50) return { error: "Code must be 50 characters or fewer." };
  if (!name) return { error: "Name is required." };
  if (name.length > 200) return { error: "Name must be 200 characters or fewer." };

  const creditHours = Number(rawCreditHours);
  if (!Number.isFinite(creditHours) || creditHours <= 0) {
    return { error: "Credit hours must be a number greater than 0." };
  }

  if (!(COURSE_STATUSES as readonly string[]).includes(rawStatus)) {
    return { error: "Status must be Active or Inactive." };
  }

  return {
    department_id: departmentId,
    code,
    name,
    credit_hours: Math.round(creditHours * 10) / 10,
    status: rawStatus as CourseStatus,
  };
}

export async function createCourseAction(
  _prevState: CourseFormState | undefined,
  formData: FormData
): Promise<CourseFormState> {
  await requireRole("management");

  const parsed = parseCourseInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  // Pre-check ahead of the DB's own courses_code_key constraint — lets the
  // form point straight at the existing course ("use existing course?")
  // instead of just a generic "already exists" error.
  const existing = await findCourseByCode(parsed.code);
  if (existing) {
    return {
      error: `A course with code "${existing.code}" already exists (${existing.name}).`,
      duplicateCourseId: existing.id,
    };
  }

  const { error } = await createCourse(parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/courses");
  redirect("/management/courses");
}

export async function updateCourseAction(
  id: string,
  _prevState: CourseFormState | undefined,
  formData: FormData
): Promise<CourseFormState> {
  await requireRole("management");

  if (!UUID_RE.test(id)) return { error: "Invalid course." };

  const parsed = parseCourseInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await updateCourse(id, parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/courses");
  redirect("/management/courses");
}

export async function toggleCourseStatusAction(id: string, nextStatus: CourseStatus) {
  await requireRole("management");
  if (!UUID_RE.test(id)) return;
  if (!(COURSE_STATUSES as readonly string[]).includes(nextStatus)) return;

  await setCourseStatus(id, nextStatus);
  revalidatePath("/management/courses");
}
