"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/dal";
import { getCurrentFacultyId } from "@/lib/academic/identity";
import { getSuperviseesForFaculty } from "@/lib/academic/supervisors";
import { STUDENT_MILESTONE_STATUSES } from "@/lib/academic/milestones";
import { upsertStudentMilestoneRecord } from "@/lib/academic/milestone-sync";
import { UUID_RE } from "@/lib/management/query-params";

export interface FacultyMilestoneUpdateState {
  error?: string;
}

/**
 * The only faculty-facing write in Phase 4, per explicit instruction:
 * "Faculty milestone update functionality only where Phase 3 explicitly
 * permits faculty writes, i.e. student_milestones." RLS
 * (student_milestones_faculty_insert/_faculty_update) already scopes this
 * to active supervisees at the database level; the supervisee-membership
 * check below is defense in depth, not a substitute for it — same
 * standard applied to every Management mutation in this codebase (never
 * rely on the caller's context alone).
 */
export async function updateStudentMilestoneAction(
  studentId: string,
  milestoneTemplateId: string,
  _prevState: FacultyMilestoneUpdateState | undefined,
  formData: FormData
): Promise<FacultyMilestoneUpdateState> {
  const profile = await requireRole("faculty");

  if (!UUID_RE.test(studentId) || !UUID_RE.test(milestoneTemplateId)) {
    return { error: "Invalid request." };
  }

  const facultyId = await getCurrentFacultyId(profile.id);
  if (!facultyId) return { error: "No faculty record is linked to your account." };

  const supervisees = await getSuperviseesForFaculty(facultyId);
  if (!supervisees.some((s) => s.student.id === studentId)) {
    return { error: "You are not an active supervisor for this student." };
  }

  const rawStatus = String(formData.get("status") ?? "").trim();
  if (!(STUDENT_MILESTONE_STATUSES as readonly string[]).includes(rawStatus)) {
    return { error: "Invalid status value." };
  }

  const rawDueDate = String(formData.get("due_date") ?? "").trim();
  const rawRemarks = String(formData.get("remarks") ?? "").trim();
  if (rawRemarks.length > 2000) return { error: "Remarks must be 2000 characters or fewer." };

  const { error } = await upsertStudentMilestoneRecord(studentId, milestoneTemplateId, {
    status: rawStatus as (typeof STUDENT_MILESTONE_STATUSES)[number],
    due_date: rawDueDate || null,
    remarks: rawRemarks || null,
  });

  if (error) {
    console.error("updateStudentMilestoneAction failed:", error);
    return { error: "Could not save changes. Please try again." };
  }

  revalidatePath(`/faculty/students/${studentId}`);
  return {};
}
