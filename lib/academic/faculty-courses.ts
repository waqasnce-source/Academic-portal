import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus } from "@/lib/management/status-enums";

/**
 * Faculty-facing coursework reads/writes (Phase 8D). Teaching ownership
 * is exclusively `course_offering_faculty` — never `supervisor_assignments`
 * (research supervision) and never a browser-supplied faculty id. Every
 * write function here is called only from Server Actions that have
 * already resolved `facultyId` from `requireRole("faculty")` +
 * `getCurrentFacultyId()`; RLS (course_offering_faculty-scoped, already
 * proven in Phase 8C) remains the actual authorization boundary — the
 * `isFacultyAssignedToOffering` check below is defense in depth, the same
 * standard already applied to every faculty mutation in this codebase
 * (see app/faculty/students/[id]/actions.ts).
 */

export interface FacultyOfferingRow {
  id: string;
  section: string;
  status: string;
  capacity: number | null;
  role: string;
  course: { id: string; code: string; name: string; credit_hours: number };
  semester: { id: string; name: string; academic_year: string };
  enrollmentCount: number;
  sessionCount: number;
  resultsPublishedCount: number;
}

interface RawFacultyOfferingRow {
  role: string;
  course_offering: {
    id: string;
    section: string;
    status: string;
    capacity: number | null;
    course: { id: string; code: string; name: string; credit_hours: number };
    semester: { id: string; name: string; academic_year: string };
    enrollments: { count: number }[] | null;
    course_sessions: { count: number }[] | null;
  };
}

/** Every offering this faculty member is assigned to, via course_offering_faculty (any role) — never any other table. */
export async function getFacultyOfferings(facultyId: string): Promise<FacultyOfferingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offering_faculty")
    .select(
      `role,
       course_offering:course_offerings!inner (
         id, section, status, capacity,
         course:courses!inner ( id, code, name, credit_hours ),
         semester:semesters!inner ( id, name, academic_year ),
         enrollments(count),
         course_sessions(count)
       )`
    )
    .eq("faculty_id", facultyId);

  if (error) {
    console.error("getFacultyOfferings failed:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as RawFacultyOfferingRow[];
  const offeringIds = rows.map((r) => r.course_offering.id);

  // Published-results count per offering — a second bounded query rather
  // than a third nested reverse-embed, since "results" is reached through
  // enrollments, not directly from course_offerings.
  const publishedCounts = new Map<string, number>();
  if (offeringIds.length > 0) {
    const { data: publishedRows } = await supabase
      .from("results")
      .select("id, enrollment:enrollments!inner ( course_offering_id )")
      .not("published_at", "is", null)
      .in("enrollment.course_offering_id", offeringIds);
    for (const r of (publishedRows ?? []) as unknown as { enrollment: { course_offering_id: string } }[]) {
      const id = r.enrollment.course_offering_id;
      publishedCounts.set(id, (publishedCounts.get(id) ?? 0) + 1);
    }
  }

  return rows.map((r) => ({
    id: r.course_offering.id,
    section: r.course_offering.section,
    status: r.course_offering.status,
    capacity: r.course_offering.capacity,
    role: r.role,
    course: r.course_offering.course,
    semester: r.course_offering.semester,
    enrollmentCount: r.course_offering.enrollments?.[0]?.count ?? 0,
    sessionCount: r.course_offering.course_sessions?.[0]?.count ?? 0,
    resultsPublishedCount: publishedCounts.get(r.course_offering.id) ?? 0,
  }));
}

/** Defense-in-depth ownership check — RLS is the actual boundary, this exists so a Server Action can return a clean error instead of a confusing RLS-filtered no-op. */
export async function isFacultyAssignedToOffering(facultyId: string, offeringId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offering_faculty")
    .select("id")
    .eq("faculty_id", facultyId)
    .eq("course_offering_id", offeringId)
    .maybeSingle();

  if (error) {
    console.error("isFacultyAssignedToOffering failed:", error);
    return false;
  }
  return data !== null;
}

export interface FacultyOfferingDetail {
  id: string;
  section: string;
  status: string;
  capacity: number | null;
  course: { code: string; name: string; credit_hours: number };
  semester: { name: string; academic_year: string };
}

/** Returns null if the offering doesn't exist OR this faculty member isn't assigned to it — callers should notFound() either way, never distinguish (avoids leaking which offerings exist). */
export async function getFacultyOfferingDetail(
  facultyId: string,
  offeringId: string
): Promise<FacultyOfferingDetail | null> {
  const assigned = await isFacultyAssignedToOffering(facultyId, offeringId);
  if (!assigned) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offerings")
    .select(
      `id, section, status, capacity,
       course:courses!inner ( code, name, credit_hours ),
       semester:semesters!inner ( name, academic_year )`
    )
    .eq("id", offeringId)
    .single();

  if (error || !data) return null;
  return data as unknown as FacultyOfferingDetail;
}

export interface OfferingRosterRow {
  enrollmentId: string;
  enrollmentStatus: string;
  student: { id: string; studentNumber: string; name: string; email: string | null };
  result: { id: string; marks: number | null; grade: string | null; grade_point: number | null; remarks: string | null; published_at: string | null } | null;
  attendancePresent: number;
  attendanceTotal: number;
}

/**
 * The offering's full roster (every enrollment, any status — a dropped/
 * completed enrollment stays visible, matching "never delete historical
 * enrollment records"). `profile:profiles` stays a plain embed — see the
 * Phase 8B/8C fix note repeated throughout this codebase; `name`/`email`
 * are the fallback identity for a profile-less student.
 */
export async function getOfferingRoster(offeringId: string): Promise<OfferingRosterRow[]> {
  const supabase = await createClient();

  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select(
      `id, status,
       student:students!inner ( id, student_number, name, email, profile:profiles ( full_name, email ) )`
    )
    .eq("course_offering_id", offeringId)
    .order("enrolled_at", { ascending: true });

  if (error) {
    console.error("getOfferingRoster enrollments failed:", error);
    return [];
  }

  const rows = (enrollments ?? []) as unknown as {
    id: string;
    status: string;
    student: { id: string; student_number: string; name: string; email: string | null; profile: { full_name: string; email: string } | null };
  }[];

  if (rows.length === 0) return [];
  const enrollmentIds = rows.map((r) => r.id);

  const [{ data: results }, { data: attendanceRows }] = await Promise.all([
    supabase
      .from("results")
      .select("id, enrollment_id, marks, grade, grade_point, remarks, published_at")
      .in("enrollment_id", enrollmentIds),
    supabase
      .from("attendance")
      .select("enrollment_id, status")
      .in("enrollment_id", enrollmentIds),
  ]);

  const resultByEnrollment = new Map(
    ((results ?? []) as { id: string; enrollment_id: string; marks: number | null; grade: string | null; grade_point: number | null; remarks: string | null; published_at: string | null }[]).map(
      (r) => [r.enrollment_id, r]
    )
  );

  const attendanceByEnrollment = new Map<string, { present: number; total: number }>();
  for (const a of (attendanceRows ?? []) as { enrollment_id: string; status: string }[]) {
    const existing = attendanceByEnrollment.get(a.enrollment_id) ?? { present: 0, total: 0 };
    existing.total += 1;
    if (a.status === "present") existing.present += 1;
    attendanceByEnrollment.set(a.enrollment_id, existing);
  }

  return rows.map((r) => {
    const result = resultByEnrollment.get(r.id) ?? null;
    const attendance = attendanceByEnrollment.get(r.id) ?? { present: 0, total: 0 };
    return {
      enrollmentId: r.id,
      enrollmentStatus: r.status,
      student: {
        id: r.student.id,
        studentNumber: r.student.student_number,
        name: r.student.profile?.full_name ?? r.student.name,
        email: r.student.profile?.email ?? r.student.email,
      },
      result: result
        ? {
            id: result.id,
            marks: result.marks,
            grade: result.grade,
            grade_point: result.grade_point,
            remarks: result.remarks,
            published_at: result.published_at,
          }
        : null,
      attendancePresent: attendance.present,
      attendanceTotal: attendance.total,
    };
  });
}

export interface CourseSessionRow {
  id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  session_type: string;
  attendanceRecordedCount: number;
}

interface RawCourseSessionRow {
  id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  session_type: string;
  attendance: { count: number }[] | null;
}

export async function getOfferingSessions(offeringId: string): Promise<CourseSessionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_sessions")
    .select("id, class_date, start_time, end_time, room, session_type, attendance(count)")
    .eq("course_offering_id", offeringId)
    .order("class_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error) {
    console.error("getOfferingSessions failed:", error);
    return [];
  }
  return ((data ?? []) as unknown as RawCourseSessionRow[]).map((r) => ({
    id: r.id,
    class_date: r.class_date,
    start_time: r.start_time,
    end_time: r.end_time,
    room: r.room,
    session_type: r.session_type,
    attendanceRecordedCount: r.attendance?.[0]?.count ?? 0,
  }));
}

export interface CourseSessionInput {
  class_date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  session_type: string;
}

export async function createCourseSession(offeringId: string, input: CourseSessionInput) {
  const supabase = await createClient();
  return supabase
    .from("course_sessions")
    .insert({ course_offering_id: offeringId, ...input })
    .select("id")
    .single();
}

export interface SessionDetail {
  id: string;
  course_offering_id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  session_type: string;
}

export async function getCourseSessionById(id: string): Promise<SessionDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_sessions")
    .select("id, course_offering_id, class_date, start_time, end_time, room, session_type")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as SessionDetail;
}

export interface SessionRosterRow {
  enrollmentId: string;
  student: { studentNumber: string; name: string };
  currentStatus: AttendanceStatus | null;
  remarks: string | null;
}

/** Only 'active' enrollments are offered for attendance — a dropped/completed enrollment isn't attending future sessions. Existing attendance rows for the session (if any) are joined in as the current value. */
export async function getSessionRoster(offeringId: string, sessionId: string): Promise<SessionRosterRow[]> {
  const supabase = await createClient();

  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select(`id, student:students!inner ( student_number, name, profile:profiles ( full_name ) )`)
    .eq("course_offering_id", offeringId)
    .eq("status", "active")
    .order("enrolled_at", { ascending: true });

  if (error) {
    console.error("getSessionRoster enrollments failed:", error);
    return [];
  }

  const rows = (enrollments ?? []) as unknown as {
    id: string;
    student: { student_number: string; name: string; profile: { full_name: string } | null };
  }[];
  if (rows.length === 0) return [];

  const { data: attendanceRows } = await supabase
    .from("attendance")
    .select("enrollment_id, status, remarks")
    .eq("course_session_id", sessionId)
    .in(
      "enrollment_id",
      rows.map((r) => r.id)
    );

  const attendanceByEnrollment = new Map(
    ((attendanceRows ?? []) as { enrollment_id: string; status: AttendanceStatus; remarks: string | null }[]).map(
      (a) => [a.enrollment_id, a]
    )
  );

  return rows.map((r) => {
    const existing = attendanceByEnrollment.get(r.id);
    return {
      enrollmentId: r.id,
      student: { studentNumber: r.student.student_number, name: r.student.profile?.full_name ?? r.student.name },
      currentStatus: existing?.status ?? null,
      remarks: existing?.remarks ?? null,
    };
  });
}

export interface AttendanceBatchRow {
  enrollment_id: string;
  course_session_id: string;
  status: AttendanceStatus;
  remarks: string | null;
  recorded_by: string;
}

/** One upsert for the whole roster — matches attendance's own unique(enrollment_id, course_session_id), so re-submitting the same session updates in place rather than duplicating. */
export async function upsertAttendanceBatch(rows: AttendanceBatchRow[]) {
  const supabase = await createClient();
  return supabase.from("attendance").upsert(rows, { onConflict: "enrollment_id,course_session_id" });
}

export interface ResultBatchRow {
  enrollment_id: string;
  marks: number | null;
  grade: string | null;
  grade_point: number | null;
  remarks: string | null;
  recorded_by: string;
}

/**
 * One upsert for the whole roster, keyed on results.enrollment_id
 * (UNIQUE). Deliberately never includes `published_at` — omitting it
 * from the payload means the INSERT branch defaults to NULL (a new
 * result starts as a draft) and the DO UPDATE branch leaves an existing
 * value untouched (grade entry never silently publishes or un-publishes
 * a result). trg_results_record_revision (Phase 8B) fires only on the
 * UPDATE branch, never the INSERT branch — exactly matching "no revision
 * on initial insert" without this function needing to know which case
 * it's in.
 */
export async function upsertResultsBatch(rows: ResultBatchRow[]) {
  const supabase = await createClient();
  return supabase.from("results").upsert(rows, { onConflict: "enrollment_id" });
}

/** Publish-only — touches published_at alone, never marks/grade/grade_point, so it never triggers a result_revisions row (the trigger only fires on those three columns changing). */
export async function publishResult(resultId: string) {
  const supabase = await createClient();
  return supabase.from("results").update({ published_at: new Date().toISOString() }).eq("id", resultId).select("id").single();
}
