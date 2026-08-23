import "server-only";

import type { DegreeLevel, EnrollmentStatus, OfferingStatus } from "./status-enums";

/**
 * Single authoritative credit-hour calculation for the reporting layer
 * (academic-sessions.ts and reports/teaching-load.ts both use this) —
 * courses.credit_hours is numeric(3,1), returned as a string by
 * supabase-js, so this is also the one place that coerces it. Session,
 * semester, discipline, course, and faculty totals must all derive from
 * this so they can never diverge the way they previously did (one surface
 * summing real credit_hours, another assuming every course is 3 CH).
 *
 * The "treat every course as 3 CH" instruction from the earlier catalogue
 * phase governed initial course-data entry, not historical reporting —
 * the database already stores the real value per course, and a 2 CH
 * course must report as 2 CH, not silently as 3.
 */
export function courseCreditHours(course: { credit_hours: number }): number {
  return Number(course.credit_hours);
}

/**
 * Enrollment statuses counted as genuine participation in an offering,
 * for "students enrolled/taught" reporting metrics (session, semester,
 * course, faculty-history headcounts). Excludes 'dropped' — a dropped
 * enrollment never completed the course and shouldn't inflate a
 * participation count — but includes 'failed', since that student did
 * take the course through to a result, exactly like 'completed' and
 * 'active' (still ongoing).
 *
 * This is a distinct, deliberately different policy from three other
 * existing enrollment-status uses elsewhere in the codebase, each correct
 * for its own purpose:
 *  - lib/management/enrollments.ts's getActiveEnrollmentCount uses ONLY
 *    'active', for a live open-seat capacity check when creating a new
 *    enrollment.
 *  - lib/academic/degree-audit.ts uses ONLY 'completed', for curriculum
 *    requirement satisfaction / degree-progress purposes.
 *  - lib/management/reports/enrollment-capacity.ts counts whichever single
 *    status the report viewer selects (defaulting to 'active'), for
 *    seat-utilization tracking against capacity.
 * None of those is "did this student genuinely participate in this
 * offering," which is what session/semester/course/faculty reporting
 * headcounts mean here.
 */
export const REPORTING_ENROLLMENT_STATUSES: readonly EnrollmentStatus[] = ["active", "completed", "failed"];

export function isReportableEnrollment(status: string): boolean {
  return (REPORTING_ENROLLMENT_STATUSES as readonly string[]).includes(status);
}

/**
 * Course-offering statuses that represent an officially conducted course
 * for historical/annual reporting purposes. 'cancelled' is unambiguously
 * excluded (never actually taught). 'planned' is also excluded — decided
 * explicitly (2026-08-17) rather than assumed: a 'planned' offering can
 * already have real faculty assigned and real students enrolled (the
 * enrollment form and student/faculty "my courses" views don't
 * distinguish it from 'open'), but it is not yet finalized, so it's kept
 * out of official reporting figures to keep historical numbers
 * conservative. Only 'open' and 'closed' offerings count.
 */
export const REPORTABLE_OFFERING_STATUSES: readonly OfferingStatus[] = ["open", "closed"];

export function isReportableOffering(status: string): boolean {
  return (REPORTABLE_OFFERING_STATUSES as readonly string[]).includes(status);
}

/**
 * Where a course's degree-level classification came from — kept
 * alongside the plain `DegreeLevel | null` value (never replacing it) so
 * existing call sites/UI are unaffected, while giving the reporting layer
 * a way to eventually audit/flag inferred-vs-authoritative figures.
 * 'structural' = derived from program_courses -> programs.degree_level
 * (exactly one distinct level linked). 'course-code' = fell back to the
 * 700-series/800-series numbering convention because no single structural
 * link existed. 'unknown' = neither signal resolved a level.
 */
export type DegreeLevelSource = "structural" | "course-code" | "unknown";

export interface DegreeLevelResult {
  level: DegreeLevel | null;
  source: DegreeLevelSource;
}

/**
 * Institution-wide "total credit hours taught" must NEVER be computed by
 * summing courseCreditHours() across every course_offering_faculty row —
 * a course with a primary instructor, a co-instructor, and a lab
 * instructor would then count 3x. The authoritative institution-wide
 * quantity is per-offering: one offering = one course = its stored CH,
 * regardless of how many faculty are attached. Per-faculty totals (as in
 * getFacultyTeachingHistory) are correct as-is, since each faculty member
 * legitimately gets credit for the offering they're assigned to — this
 * note only matters the moment someone sums *across* faculty rows to
 * produce a single institution-wide figure. No such institution-wide
 * total exists yet in this codebase; this is a guardrail for when one is
 * built.
 */
export const INSTITUTION_WIDE_CH_NOTE =
  "Institution-wide CH totals must be computed per-offering (offering count x its stored CH), never by summing per-faculty totals across course_offering_faculty rows.";
