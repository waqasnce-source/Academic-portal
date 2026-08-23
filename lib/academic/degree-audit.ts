import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getStudentProfileSummary } from "./identity";
import { getApplicableCurriculumRequirements, programHasAnyCurriculumConfigured, type CurriculumRequirementRow, type RequirementCategory } from "./curriculum";
import { getActiveGradingScale } from "@/lib/management/grading-scale";
import type { GradingScaleRow } from "@/lib/management/grading-scale";

/**
 * Pure degree-audit computation (Phase 8E), mirroring the
 * status-engine.ts convention exactly: `computeDegreeAudit()` takes
 * already-fetched data and returns a structured result with no side
 * effects and nothing persisted; `getStudentDegreeAudit()` is the
 * fetch-then-compute convenience wrapper future callers should use.
 * computeAcademicStatus() itself is not modified — this is a parallel,
 * independent computation, not a change to the existing engine.
 */

export interface StudentCourseworkEnrollmentRow {
  enrollmentId: string;
  status: string;
  course: { id: string; code: string; name: string; credit_hours: number };
  semesterId: string;
  semesterStartDate: string;
  result: { marks: number | null; grade: string | null; grade_point: number | null; published_at: string | null } | null;
}

/**
 * Every enrollment a student has ever had, any status — a dropped/failed
 * attempt is not filtered out here (needed to detect multiple attempts);
 * the pure function below decides what counts as "completed". `result`
 * is whatever the caller's own RLS permits to see: a management caller
 * sees draft and published results alike, a student caller (via RLS) only
 * ever sees their own published ones — computeDegreeAudit() additionally
 * filters to published results for any GPA figure regardless of caller,
 * so an unpublished result reaching this function (management case) is
 * still never used for a GPA number.
 */
export async function getStudentCourseworkEnrollments(studentId: string): Promise<StudentCourseworkEnrollmentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `id, status,
       course_offering:course_offerings!inner (
         semester_id,
         semester:semesters!inner ( start_date ),
         course:courses!inner ( id, code, name, credit_hours )
       ),
       result:results ( marks, grade, grade_point, published_at )`
    )
    .eq("student_id", studentId);

  if (error) {
    console.error("getStudentCourseworkEnrollments failed:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as {
    id: string;
    status: string;
    course_offering: {
      semester_id: string;
      semester: { start_date: string };
      course: { id: string; code: string; name: string; credit_hours: number };
    };
    result: { marks: number | null; grade: string | null; grade_point: number | null; published_at: string | null } | null;
  }[];

  return rows.map((r) => ({
    enrollmentId: r.id,
    status: r.status,
    course: r.course_offering.course,
    semesterId: r.course_offering.semester_id,
    semesterStartDate: r.course_offering.semester.start_date,
    result: r.result,
  }));
}

const COMPLETED_ENROLLMENT_STATUS = "completed";

export type CurriculumStatus = "not_configured" | "partially_configured" | "configured_satisfied" | "configured_incomplete";

export interface MandatoryCourseStatus {
  courseId: string;
  code: string;
  name: string;
  creditHours: number;
  category: RequirementCategory;
  completed: boolean;
}

export interface CategoryProgress {
  category: RequirementCategory;
  /** Sum of required_credit_hours across every category-level (course_id null) row in this category — null if no quota row is configured for it. */
  requiredCreditHours: number | null;
  /** Credit hours completed among this category's configured course pool (course-level rows, mandatory or not) — never inferred from courses outside that configured pool. */
  completedCreditHours: number;
  remainingCreditHours: number | null;
  mandatoryCourses: MandatoryCourseStatus[];
  /** True if a quota row exists for this category but zero course-level rows define an eligible pool — a real configuration gap, surfaced rather than silently treated as satisfied or unsatisfiable without explanation. */
  quotaConfiguredWithNoEligibleCourses: boolean;
  satisfied: boolean;
}

export interface GpaFigure {
  gradingScaleConfigured: boolean;
  creditHoursCounted: number;
  gpa: number | null;
  coursesExcludedNoGradePoint: { courseId: string; code: string }[];
  coursesExcludedMultipleAttempts: { courseId: string; code: string }[];
}

export interface SemesterProgress {
  distinctSemestersEnrolled: number;
  semesters: { semesterId: string; startDate: string }[];
}

/**
 * Raw coursework credit-hour totals by enrollment status, independent of
 * curriculum_requirements category mapping. Distinct from
 * computeDegreeAudit()'s byCategory[].completedCreditHours (below), which
 * only counts a course toward a category if a course-level
 * curriculum_requirements row links it there — most programs currently
 * have only category-level quota rows (no course-level rows), so that
 * figure is 0 regardless of what a student has actually completed. This
 * is the simple, direct figure the Academic Progress "Coursework
 * Progress" panel needs: the same COMPLETED_ENROLLMENT_STATUS filter and
 * the same credit_hours field, just not gated by curriculum-category
 * configuration, and no new enrollment fetch (reuses the same
 * StudentCourseworkEnrollmentRow[] getStudentCourseworkEnrollments()
 * already produces). 'dropped' enrollments are excluded from every
 * bucket (never counted as completed, in-progress, or failed), per
 * explicit instruction.
 */
export interface CreditHourBreakdown {
  completedCreditHours: number;
  inProgressCreditHours: number;
  failedCreditHours: number;
  completedCourseCount: number;
  inProgressCourseCount: number;
  failedCourseCount: number;
}

export function computeCreditHourBreakdown(enrollments: StudentCourseworkEnrollmentRow[]): CreditHourBreakdown {
  const completed = enrollments.filter((e) => e.status === "completed");
  const inProgress = enrollments.filter((e) => e.status === "active");
  const failed = enrollments.filter((e) => e.status === "failed");
  const sumCh = (rows: StudentCourseworkEnrollmentRow[]) => rows.reduce((sum, e) => sum + Number(e.course.credit_hours), 0);
  return {
    completedCreditHours: sumCh(completed),
    inProgressCreditHours: sumCh(inProgress),
    failedCreditHours: sumCh(failed),
    completedCourseCount: completed.length,
    inProgressCourseCount: inProgress.length,
    failedCourseCount: failed.length,
  };
}

export interface DegreeAuditResult {
  curriculumStatus: CurriculumStatus;
  byCategory: CategoryProgress[];
  totalRequiredCreditHours: number | null;
  totalCompletedCreditHours: number;
  totalRemainingCreditHours: number | null;
  missingMandatoryCourses: MandatoryCourseStatus[];
  satisfiesCourseworkRequirement: boolean;
  semesterProgress: SemesterProgress;
  cgpa: GpaFigure;
  currentSemesterGpa: GpaFigure | null;
  /** Raw, category-independent CH breakdown — see computeCreditHourBreakdown() above. */
  creditHourBreakdown: CreditHourBreakdown;
}

function resolveGradePoint(
  result: StudentCourseworkEnrollmentRow["result"],
  activeGradingScale: GradingScaleRow[]
): number | null {
  if (!result) return null;
  if (result.grade_point !== null) return result.grade_point;
  if (result.marks === null) return null;
  // Only ever derived from an actually-configured active band — never a
  // formula/assumed scale. min/max are both inclusive, matching the
  // grading_scale_no_overlap_active exclusion constraint's own semantics.
  const band = activeGradingScale.find((b) => result.marks! >= b.min_marks && result.marks! <= b.max_marks);
  return band ? band.grade_point : null;
}

function computeGpaFigure(
  enrollments: StudentCourseworkEnrollmentRow[],
  activeGradingScale: GradingScaleRow[]
): GpaFigure {
  const completedPublished = enrollments.filter(
    (e) => e.status === COMPLETED_ENROLLMENT_STATUS && e.result?.published_at != null
  );

  // Multiple attempts at the same course among completed+published
  // enrollments — the institutional repeat/improvement rule (best/latest/
  // average) is not configured anywhere, so per explicit instruction these
  // are excluded from the GPA figure entirely rather than guessed at.
  const byCourse = new Map<string, StudentCourseworkEnrollmentRow[]>();
  for (const e of completedPublished) {
    const list = byCourse.get(e.course.id) ?? [];
    list.push(e);
    byCourse.set(e.course.id, list);
  }

  const coursesExcludedMultipleAttempts: { courseId: string; code: string }[] = [];
  const coursesExcludedNoGradePoint: { courseId: string; code: string }[] = [];

  let weightedPointSum = 0;
  let creditHoursCounted = 0;

  for (const [courseId, list] of byCourse) {
    if (list.length > 1) {
      coursesExcludedMultipleAttempts.push({ courseId, code: list[0].course.code });
      continue;
    }
    const enrollment = list[0];
    const gradePoint = resolveGradePoint(enrollment.result, activeGradingScale);
    if (gradePoint === null) {
      coursesExcludedNoGradePoint.push({ courseId, code: enrollment.course.code });
      continue;
    }
    weightedPointSum += gradePoint * enrollment.course.credit_hours;
    creditHoursCounted += enrollment.course.credit_hours;
  }

  return {
    gradingScaleConfigured: activeGradingScale.length > 0,
    creditHoursCounted,
    gpa: creditHoursCounted > 0 ? Math.round((weightedPointSum / creditHoursCounted) * 100) / 100 : null,
    coursesExcludedNoGradePoint,
    coursesExcludedMultipleAttempts,
  };
}

export function computeDegreeAudit(
  requirements: CurriculumRequirementRow[],
  programHasAnyCurriculum: boolean,
  enrollments: StudentCourseworkEnrollmentRow[],
  activeGradingScale: GradingScaleRow[]
): DegreeAuditResult {
  const completedCourseIds = new Set(
    enrollments.filter((e) => e.status === COMPLETED_ENROLLMENT_STATUS).map((e) => e.course.id)
  );

  const categories = Array.from(new Set(requirements.map((r) => r.requirement_category)));

  const byCategory: CategoryProgress[] = categories.map((category) => {
    const rowsInCategory = requirements.filter((r) => r.requirement_category === category);
    const courseLevelRows = rowsInCategory.filter((r) => r.course_id !== null && r.course);
    const quotaRows = rowsInCategory.filter((r) => r.course_id === null && r.required_credit_hours !== null);

    const mandatoryCourses: MandatoryCourseStatus[] = courseLevelRows
      .filter((r) => r.is_mandatory)
      .map((r) => ({
        courseId: r.course!.id,
        code: r.course!.code,
        name: r.course!.name,
        creditHours: r.course!.credit_hours,
        category,
        completed: completedCourseIds.has(r.course!.id),
      }));

    const completedCreditHours = courseLevelRows
      .filter((r) => completedCourseIds.has(r.course!.id))
      .reduce((sum, r) => sum + r.course!.credit_hours, 0);

    const requiredCreditHours =
      quotaRows.length > 0 ? quotaRows.reduce((sum, r) => sum + (r.required_credit_hours ?? 0), 0) : null;

    const remainingCreditHours = requiredCreditHours !== null ? Math.max(0, requiredCreditHours - completedCreditHours) : null;

    const quotaConfiguredWithNoEligibleCourses = quotaRows.length > 0 && courseLevelRows.length === 0;

    const mandatorySatisfied = mandatoryCourses.every((c) => c.completed);
    const quotaSatisfied = requiredCreditHours === null || completedCreditHours >= requiredCreditHours;

    return {
      category,
      requiredCreditHours,
      completedCreditHours,
      remainingCreditHours,
      mandatoryCourses,
      quotaConfiguredWithNoEligibleCourses,
      satisfied: mandatorySatisfied && quotaSatisfied && !quotaConfiguredWithNoEligibleCourses,
    };
  });

  const missingMandatoryCourses = byCategory.flatMap((c) => c.mandatoryCourses.filter((m) => !m.completed));

  // Each category's own contribution to the total: its CH quota if one is
  // configured (mandatory courses already count toward that quota via
  // completedCreditHours, so their hours aren't added a second time), or
  // else the sum of its mandatory courses' credit hours (the only figure
  // available when no quota exists for that category).
  const totalRequiredCreditHours =
    byCategory.length === 0
      ? null
      : byCategory.reduce(
          (sum, c) =>
            sum + (c.requiredCreditHours ?? c.mandatoryCourses.reduce((s, m) => s + m.creditHours, 0)),
          0
        );

  const totalCompletedCreditHours = byCategory.reduce((sum, c) => sum + c.completedCreditHours, 0);
  const totalRemainingCreditHours =
    totalRequiredCreditHours !== null ? Math.max(0, totalRequiredCreditHours - totalCompletedCreditHours) : null;

  let curriculumStatus: CurriculumStatus;
  if (!programHasAnyCurriculum) {
    curriculumStatus = "not_configured";
  } else if (requirements.length === 0) {
    curriculumStatus = "partially_configured";
  } else {
    const allSatisfied = byCategory.every((c) => c.satisfied);
    curriculumStatus = allSatisfied ? "configured_satisfied" : "configured_incomplete";
  }

  // Never trivially true: with nothing configured, no condition has been
  // established, so coursework can never be marked satisfied purely from
  // accumulated credit hours.
  const satisfiesCourseworkRequirement = curriculumStatus === "configured_satisfied";

  const semesterMap = new Map<string, string>();
  for (const e of enrollments) semesterMap.set(e.semesterId, e.semesterStartDate);
  const semesters = Array.from(semesterMap.entries())
    .map(([semesterId, startDate]) => ({ semesterId, startDate }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const cgpa = computeGpaFigure(enrollments, activeGradingScale);
  const latestSemesterId = semesters.at(-1)?.semesterId ?? null;
  const currentSemesterGpa = latestSemesterId
    ? computeGpaFigure(
        enrollments.filter((e) => e.semesterId === latestSemesterId),
        activeGradingScale
      )
    : null;

  return {
    curriculumStatus,
    byCategory,
    totalRequiredCreditHours,
    totalCompletedCreditHours,
    totalRemainingCreditHours,
    missingMandatoryCourses,
    satisfiesCourseworkRequirement,
    semesterProgress: { distinctSemestersEnrolled: semesters.length, semesters },
    cgpa,
    currentSemesterGpa,
    creditHourBreakdown: computeCreditHourBreakdown(enrollments),
  };
}

/**
 * Fetch-then-compute convenience wrapper. Returns null under the same
 * conditions getStudentAcademicStatus() does (no student/program found) —
 * same null-handling convention as the rest of lib/academic/*.ts.
 */
export async function getStudentDegreeAudit(studentId: string): Promise<DegreeAuditResult | null> {
  const summary = await getStudentProfileSummary(studentId);
  if (!summary || !summary.program) return null;

  const [requirements, programConfigured, enrollments, activeGradingScale] = await Promise.all([
    getApplicableCurriculumRequirements(summary.program.id, summary.specialization?.id ?? null, summary.phd_entry_basis),
    programHasAnyCurriculumConfigured(summary.program.id),
    getStudentCourseworkEnrollments(studentId),
    getActiveGradingScale(),
  ]);

  return computeDegreeAudit(requirements, programConfigured, enrollments, activeGradingScale);
}
