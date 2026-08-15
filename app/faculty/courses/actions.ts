"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/dal";
import { getCurrentFacultyId } from "@/lib/academic/identity";
import { getStudentById } from "@/lib/management/students";
import { notifyIfLinked } from "@/lib/management/notifications";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";
import { ATTENDANCE_STATUSES } from "@/lib/management/status-enums";
import {
  isFacultyAssignedToOffering,
  getOfferingRoster,
  getCourseSessionById,
  getSessionRoster,
  createCourseSession,
  upsertAttendanceBatch,
  upsertResultsBatch,
  publishResult,
  type CourseSessionInput,
  type AttendanceBatchRow,
  type ResultBatchRow,
} from "@/lib/academic/faculty-courses";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  course_sessions_course_offering_id_class_date_start_time_key: "A session already exists for this offering at this date and time.",
  course_sessions_check: "End time must be after start time.",
};

export interface FacultyCourseFormState {
  error?: string;
}

/**
 * Resolves and re-verifies the current faculty member's identity and
 * ownership of the given offering — every action below calls this first.
 * RLS is the actual boundary (course_offering_faculty-scoped, proven in
 * Phase 8C); this exists so an unauthorized attempt gets a clean error
 * instead of a confusing RLS-filtered silent no-op, per the explicit
 * "never trust a browser-supplied faculty_id" instruction.
 */
async function requireOwnedOffering(offeringId: string): Promise<{ facultyId: string } | { error: string }> {
  const profile = await requireRole("faculty");
  const facultyId = await getCurrentFacultyId(profile.id);
  if (!facultyId) return { error: "No faculty record is linked to your account." };

  const assigned = await isFacultyAssignedToOffering(facultyId, offeringId);
  if (!assigned) return { error: "You are not assigned to this course offering." };

  return { facultyId };
}

export async function createCourseSessionAction(
  offeringId: string,
  _prevState: FacultyCourseFormState | undefined,
  formData: FormData
): Promise<FacultyCourseFormState> {
  if (!UUID_RE.test(offeringId)) return { error: "Invalid course offering." };
  const auth = await requireOwnedOffering(offeringId);
  if ("error" in auth) return auth;

  const classDate = String(formData.get("class_date") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const room = String(formData.get("room") ?? "").trim();
  const sessionType = String(formData.get("session_type") ?? "").trim();

  if (!classDate || !startTime || !endTime) return { error: "Date, start time, and end time are required." };
  if (!sessionType) return { error: "Session type is required." };
  if (endTime <= startTime) return { error: "End time must be after start time." };

  const input: CourseSessionInput = {
    class_date: classDate,
    start_time: startTime,
    end_time: endTime,
    room: room || null,
    session_type: sessionType,
  };

  const { error } = await createCourseSession(offeringId, input);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath(`/faculty/courses/${offeringId}`);
  return {};
}

export async function recordAttendanceAction(
  offeringId: string,
  sessionId: string,
  _prevState: FacultyCourseFormState | undefined,
  formData: FormData
): Promise<FacultyCourseFormState> {
  if (!UUID_RE.test(offeringId) || !UUID_RE.test(sessionId)) return { error: "Invalid request." };
  const auth = await requireOwnedOffering(offeringId);
  if ("error" in auth) return auth;

  const session = await getCourseSessionById(sessionId);
  if (!session || session.course_offering_id !== offeringId) return { error: "Session not found for this offering." };

  // Only enrollment ids that genuinely belong to this offering's roster
  // are ever submitted as form field names, but the roster is re-fetched
  // here (not trusted from the form) so a manipulated field name cannot
  // record attendance for an unrelated enrollment — RLS would also block
  // this via trg_attendance_offering_match / course_offering_faculty
  // scoping, this is the clean-error layer in front of it.
  const roster = await getSessionRoster(offeringId, sessionId);
  const rosterIds = new Set(roster.map((r) => r.enrollmentId));

  const rows: AttendanceBatchRow[] = [];
  for (const enrollmentId of rosterIds) {
    const rawStatus = String(formData.get(`status_${enrollmentId}`) ?? "").trim();
    if (!rawStatus) continue;
    if (!(ATTENDANCE_STATUSES as readonly string[]).includes(rawStatus)) {
      return { error: "Invalid attendance status submitted." };
    }
    const remarks = String(formData.get(`remarks_${enrollmentId}`) ?? "").trim();
    rows.push({
      enrollment_id: enrollmentId,
      course_session_id: sessionId,
      status: rawStatus as (typeof ATTENDANCE_STATUSES)[number],
      remarks: remarks || null,
      recorded_by: auth.facultyId,
    });
  }

  if (rows.length === 0) return { error: "No attendance was submitted." };

  const { error } = await upsertAttendanceBatch(rows);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath(`/faculty/courses/${offeringId}/sessions/${sessionId}`);
  revalidatePath(`/faculty/courses/${offeringId}`);
  return {};
}

export async function saveGradesAction(
  offeringId: string,
  _prevState: FacultyCourseFormState | undefined,
  formData: FormData
): Promise<FacultyCourseFormState> {
  if (!UUID_RE.test(offeringId)) return { error: "Invalid course offering." };
  const auth = await requireOwnedOffering(offeringId);
  if ("error" in auth) return auth;

  // Same "re-fetch the real roster, never trust submitted ids alone"
  // discipline as attendance.
  const roster = await getOfferingRoster(offeringId);

  const rows: ResultBatchRow[] = [];
  for (const r of roster) {
    const rawMarks = String(formData.get(`marks_${r.enrollmentId}`) ?? "").trim();
    const rawGrade = String(formData.get(`grade_${r.enrollmentId}`) ?? "").trim();
    const rawGradePoint = String(formData.get(`grade_point_${r.enrollmentId}`) ?? "").trim();
    const rawRemarks = String(formData.get(`remarks_${r.enrollmentId}`) ?? "").trim();

    // A row with nothing entered at all is skipped — grade entry doesn't
    // create an empty draft result for every student just because the
    // form was submitted.
    if (!rawMarks && !rawGrade && !rawGradePoint && !rawRemarks) continue;

    const marks = rawMarks ? Number(rawMarks) : null;
    if (marks !== null && (!Number.isFinite(marks) || marks < 0)) {
      return { error: `Invalid marks value for ${r.student.name}.` };
    }
    const gradePoint = rawGradePoint ? Number(rawGradePoint) : null;
    if (gradePoint !== null && (!Number.isFinite(gradePoint) || gradePoint < 0)) {
      return { error: `Invalid grade point value for ${r.student.name}.` };
    }

    rows.push({
      enrollment_id: r.enrollmentId,
      marks,
      grade: rawGrade || null,
      grade_point: gradePoint,
      remarks: rawRemarks || null,
      recorded_by: auth.facultyId,
    });
  }

  if (rows.length === 0) return { error: "No grades were entered." };

  const { error } = await upsertResultsBatch(rows);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath(`/faculty/courses/${offeringId}`);
  return {};
}

export async function publishResultAction(offeringId: string, resultId: string, studentId: string) {
  if (!UUID_RE.test(offeringId) || !UUID_RE.test(resultId)) return;
  const auth = await requireOwnedOffering(offeringId);
  if ("error" in auth) return;

  const { error } = await publishResult(resultId);
  if (error) {
    console.error("publishResultAction failed:", error);
    return;
  }

  const student = await getStudentById(studentId);
  await notifyIfLinked(
    student?.profile_id ?? null,
    "Result Published",
    "One of your course results has been published. Check your academic record for details."
  );

  revalidatePath(`/faculty/courses/${offeringId}`);
}
