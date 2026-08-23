import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { DegreeLevel } from "./status-enums";
import {
  courseCreditHours,
  isReportableEnrollment,
  isReportableOffering,
  type DegreeLevelResult,
  type DegreeLevelSource,
} from "./reporting-policy";
import { getStudentAcademicStatus, deriveOverallStage, type OverallStage, type StudentStatusLabel } from "@/lib/academic/status-engine";
import { getStudentDegreeAudit } from "@/lib/academic/degree-audit";
import { getRequiredCourseworkCreditHours } from "@/lib/academic/progression-rules";
import { getSupervisorAssignmentsForStudent } from "@/lib/academic/supervisors";
import type { PhdEntryBasis } from "@/lib/academic/milestones";

/**
 * Session-wise view of postgraduate teaching activity — Academic Session
 * (= semesters.academic_year, grouped) -> Semester -> Discipline (=
 * departments) -> Course -> Faculty -> Students. No new tables: every
 * concept here already exists (semesters, courses, course_offerings,
 * course_offering_faculty, enrollments) — this module is purely a read/
 * aggregation layer on top of them, per explicit instruction not to
 * duplicate the existing relational model.
 *
 * PostgREST aggregate functions (SUM/GROUP BY) are disabled on this
 * project (confirmed live during the teaching-load report's own
 * implementation — PGRST123), so every stat here is computed by fetching
 * the full set of raw rows through the normal RLS-respecting client and
 * grouping/summing in application code — the same approach
 * lib/management/reports/teaching-load.ts already established.
 *
 * This module is a HISTORICAL reporting API by design: it deliberately
 * never filters courses/departments/faculty by their current `status`
 * column. A course offered in a session five years ago must still appear
 * in that session's report even if the course, department, or faculty
 * member is inactive today — history doesn't change because something
 * later became inactive. A "what's currently active" dashboard view is a
 * genuinely different question and should be built as an explicit filter
 * layered on top of (or alongside) these functions, not by adding
 * current-status filtering in here.
 *
 * All figures apply the shared, documented policies from
 * ./reporting-policy.ts: courseCreditHours() for every CH figure,
 * isReportableOffering() to decide which offering statuses count as
 * officially conducted, and isReportableEnrollment() to decide which
 * enrollment statuses count as genuine participation. Nothing in this
 * file computes CH or headcounts any other way.
 */

/**
 * Course codes follow discipline.number (e.g. Geol.719): the established
 * NCEG convention is 700-series = MS/M.Phil., 800-series = Ph.D. Used as
 * a fallback only -- courseDegreeLevel() below prefers the structural
 * signal (which program(s) a course is actually linked to via
 * program_courses) whenever one exists, per the instruction to derive
 * this from "the established course/program structure rather than
 * relying only on manually entered labels".
 */
function inferDegreeLevelFromCode(code: string): DegreeLevel | null {
  const match = code.match(/\.(\d{3})/);
  if (!match) return null;
  const num = Number(match[1]);
  if (num >= 700 && num <= 799) return "master";
  if (num >= 800 && num <= 899) return "phd";
  return null;
}

const DEGREE_LEVEL_LABELS: Record<DegreeLevel, string> = {
  diploma: "Diploma",
  bachelor: "Bachelor",
  master: "MS/M.Phil.",
  phd: "Ph.D.",
};

export function degreeLevelLabel(level: DegreeLevel | null): string {
  return level ? DEGREE_LEVEL_LABELS[level] : "Unknown";
}

interface RawOfferingRow {
  id: string;
  section: string;
  status: string;
  course: {
    id: string;
    code: string;
    name: string;
    credit_hours: number;
    department: { id: string; code: string; name: string };
    program_courses: { program: { degree_level: DegreeLevel } | null }[] | null;
  };
  semester: {
    id: string;
    name: string;
    academic_year: string;
    start_date: string;
    end_date: string;
    status: string;
  };
  course_offering_faculty: {
    role: string;
    faculty: { id: string; name: string; profile: { full_name: string } | null };
  }[];
  /**
   * Actual (student_id, status) rows, not a count aggregate -- a
   * "students enrolled" figure at the session/semester level must be a
   * *distinct* student count (someone taking two courses in the same
   * semester is one student, not two), which is only derivable with real
   * IDs to dedupe, and must apply isReportableEnrollment() before
   * counting/deduping (a dropped enrollment shouldn't count as
   * participation anywhere in this module).
   */
  enrollments: { student_id: string; status: string }[] | null;
}

const RAW_SELECT = `
  id, section, status,
  course:courses!inner (
    id, code, name, credit_hours,
    department:departments!inner ( id, code, name ),
    program_courses ( program:programs ( degree_level ) )
  ),
  semester:semesters!inner ( id, name, academic_year, start_date, end_date, status ),
  course_offering_faculty ( role, faculty:faculty!inner ( id, name, profile:profiles ( full_name ) ) ),
  enrollments ( student_id, status )
`;

/** Rows per page for fetchRawOfferings()'s pagination loop. */
const FETCH_PAGE_SIZE = 1000;

/**
 * Safety ceiling on the pagination loop below — NOT a normal-operation
 * cap. fetchRawOfferings() pages through the ENTIRE course_offerings
 * table (ordered deterministically by `id`), so under normal growth this
 * ceiling is never approached. If it ever is (50,000 rows), that means
 * either a real institution-scale dataset that now needs genuine
 * database-side aggregation instead of in-memory grouping, or a bug in
 * the pagination loop itself — either way, throwing here is correct:
 * silently returning a partial dataset as if it were the complete report
 * is exactly the failure mode this hardening exists to prevent.
 */
const MAX_PAGES = 50;

/**
 * Fetches every course_offerings row (with the full RAW_SELECT embed)
 * through real pagination rather than a single capped `.limit()` fetch —
 * a fixed cap on an ever-growing historical dataset would eventually
 * (and silently) truncate a report with no indication anything was
 * missing. Ordered by `id` (always present, always unique) so pages never
 * skip or duplicate rows. Every aggregation function in this module
 * builds on this single shared fetch, avoiding near-identical queries
 * that could drift out of sync.
 *
 * Throws (rather than returning an empty/partial array) on either a
 * genuine Supabase error or on hitting MAX_PAGES, since both are cases
 * where silently proceeding with incomplete data would produce a report
 * that looks complete but isn't. Callers are Server Components, so this
 * surfaces through the nearest route error.tsx boundary.
 *
 * Wrapped in React's cache() so multiple call sites needing overlapping
 * data within one request (e.g. the faculty hub calling both
 * getFacultyTeachingHistory() and getAcademicSessionsOverview()) hit the
 * database once instead of once per call — request-scoped only, so this
 * never returns stale data across separate page loads.
 */
const fetchRawOfferings = cache(async (): Promise<RawOfferingRow[]> => {
  const supabase = await createClient();
  const all: RawOfferingRow[] = [];

  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
    const from = pageIndex * FETCH_PAGE_SIZE;
    const to = from + FETCH_PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("course_offerings")
      .select(RAW_SELECT)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("fetchRawOfferings failed:", error);
      throw new Error("Could not load course offering data for reporting.");
    }

    const rows = (data ?? []) as unknown as RawOfferingRow[];
    all.push(...rows);

    if (rows.length < FETCH_PAGE_SIZE) return all;
  }

  throw new Error(
    `fetchRawOfferings: exceeded the safety ceiling of ${MAX_PAGES * FETCH_PAGE_SIZE} rows without reaching the end of the dataset — refusing to return a report silently built on a truncated dataset. This module needs a genuine database-side aggregation path before the dataset grows this large.`
  );
});

/**
 * Semester-scoped counterpart to fetchRawOfferings() — filters
 * server-side via `.eq("semester_id", ...)` instead of paginating the
 * entire (potentially multi-year) course_offerings table and filtering
 * in JS. One semester's offerings are inherently small and bounded (never
 * institution-history-scale), so no pagination loop or safety ceiling is
 * needed here — this is a genuine performance improvement for any
 * semester-scoped view (getSemesterDetail, the semester operations
 * dashboard, the semester student overview), all of which used to pull
 * every session's offerings just to discard everything outside one
 * semester.
 *
 * Also wrapped in cache() — getSemesterOperations() and getSemesterDetail()
 * both fetch this same semester's rows independently, so any request that
 * ends up calling both is deduplicated the same way as fetchRawOfferings().
 */
const fetchRawOfferingsForSemester = cache(async (semesterId: string): Promise<RawOfferingRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("course_offerings").select(RAW_SELECT).eq("semester_id", semesterId);

  if (error) {
    console.error("fetchRawOfferingsForSemester failed:", error);
    throw new Error("Could not load course offering data for this semester.");
  }
  return (data ?? []) as unknown as RawOfferingRow[];
});

function facultyDisplayName(f: { name: string; profile: { full_name: string } | null }): string {
  return f.profile?.full_name ?? f.name;
}

/** Sums courseCreditHours() across a set of offering rows — the one place session/semester/faculty CH totals are produced, so they can never diverge from the per-course figures shown alongside them. */
function sumCreditHours(rows: RawOfferingRow[]): number {
  return rows.reduce((sum, row) => sum + courseCreditHours(row.course), 0);
}

/** Reportable (participation-counting) enrollment rows only — see isReportableEnrollment() in reporting-policy.ts. */
function reportableEnrollments(row: RawOfferingRow): { student_id: string; status: string }[] {
  return (row.enrollments ?? []).filter((e) => isReportableEnrollment(e.status));
}

/**
 * Exported so callers outside this module (course-offerings.ts's
 * course-offering detail page) can reuse the exact same structural
 * -> code-fallback determination instead of re-implementing it — per
 * explicit instruction not to build a second, independent degree-level
 * classifier.
 */
export function courseDegreeLevel(course: {
  code: string;
  program_courses: { program: { degree_level: DegreeLevel } | null }[] | null;
}): DegreeLevelResult {
  const linked = new Set(
    (course.program_courses ?? [])
      .map((pc) => pc.program?.degree_level)
      .filter((d): d is DegreeLevel => Boolean(d))
  );
  if (linked.size === 1) {
    return { level: [...linked][0], source: "structural" };
  }
  const inferred = inferDegreeLevelFromCode(course.code);
  const source: DegreeLevelSource = inferred ? "course-code" : "unknown";
  return { level: inferred, source };
}

// ---------------------------------------------------------------
// Level 1 — Academic Sessions overview
// ---------------------------------------------------------------

export interface SemesterSummary {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  offeringCount: number;
  totalCreditHours: number;
  facultyCount: number;
  studentCount: number;
}

export interface AcademicSessionSummary {
  academicYear: string;
  semesters: SemesterSummary[];
  totalCourses: number;
  totalCreditHours: number;
  facultyCount: number;
  studentCount: number;
  /** Distinct disciplines (departments) with at least one reportable offering somewhere in this session, name-sorted. */
  disciplines: { id: string; name: string }[];
}

export async function getAcademicSessionsOverview(): Promise<AcademicSessionSummary[]> {
  const rows = (await fetchRawOfferings()).filter((r) => isReportableOffering(r.status));

  const sessions = new Map<string, Map<string, RawOfferingRow[]>>();
  for (const row of rows) {
    const year = row.semester.academic_year;
    const semesterId = row.semester.id;
    if (!sessions.has(year)) sessions.set(year, new Map());
    const bySemester = sessions.get(year)!;
    if (!bySemester.has(semesterId)) bySemester.set(semesterId, []);
    bySemester.get(semesterId)!.push(row);
  }

  const result: AcademicSessionSummary[] = [];
  for (const [academicYear, bySemester] of sessions) {
    const semesters: SemesterSummary[] = [];
    const sessionFaculty = new Set<string>();
    const sessionStudents = new Set<string>();
    const sessionDisciplines = new Map<string, { id: string; name: string }>();
    let totalCourses = 0;
    const sessionRows: RawOfferingRow[] = [];

    for (const [, offeringRows] of bySemester) {
      const meta = offeringRows[0].semester;
      const facultyIds = new Set<string>();
      const semesterStudents = new Set<string>();
      for (const row of offeringRows) {
        for (const a of row.course_offering_faculty) {
          facultyIds.add(a.faculty.id);
          sessionFaculty.add(a.faculty.id);
        }
        for (const e of reportableEnrollments(row)) {
          semesterStudents.add(e.student_id);
          sessionStudents.add(e.student_id);
        }
        sessionDisciplines.set(row.course.department.id, {
          id: row.course.department.id,
          name: row.course.department.name,
        });
      }
      semesters.push({
        id: meta.id,
        name: meta.name,
        status: meta.status,
        startDate: meta.start_date,
        endDate: meta.end_date,
        offeringCount: offeringRows.length,
        totalCreditHours: sumCreditHours(offeringRows),
        facultyCount: facultyIds.size,
        studentCount: semesterStudents.size,
      });
      totalCourses += offeringRows.length;
      sessionRows.push(...offeringRows);
    }

    semesters.sort((a, b) => a.startDate.localeCompare(b.startDate));

    result.push({
      academicYear,
      semesters,
      totalCourses,
      totalCreditHours: sumCreditHours(sessionRows),
      facultyCount: sessionFaculty.size,
      studentCount: sessionStudents.size,
      disciplines: [...sessionDisciplines.values()].sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  result.sort((a, b) => a.academicYear.localeCompare(b.academicYear));
  return result;
}

/**
 * Level 2 (session detail) reuses the Level 1 aggregation rather than a
 * second query path — this dataset is small enough that recomputing all
 * sessions and picking one is simpler and less error-prone than
 * maintaining a parallel per-session query, matching the "no complicated
 * analytics" instruction.
 */
export async function getAcademicSessionDetail(academicYear: string): Promise<AcademicSessionSummary | null> {
  const sessions = await getAcademicSessionsOverview();
  return sessions.find((s) => s.academicYear === academicYear) ?? null;
}

/**
 * "Current" session determination for the Academic Sessions landing
 * page's default selection: prefers whichever session contains a
 * semester management has explicitly marked 'ongoing' (semesters.status
 * is maintained data, not inferred from today's date, so this trusts it
 * rather than doing separate date-range math). Falls back to the most
 * recent academic_year present (sessions are already sorted ascending by
 * getAcademicSessionsOverview) when no semester is currently 'ongoing' —
 * e.g. between sessions, or before any semester has been marked ongoing.
 * Returns null only when there are no sessions at all.
 */
export function getCurrentAcademicYear(sessions: AcademicSessionSummary[]): string | null {
  const ongoing = sessions.find((s) => s.semesters.some((sem) => sem.status === "ongoing"));
  if (ongoing) return ongoing.academicYear;
  return sessions.length > 0 ? sessions[sessions.length - 1].academicYear : null;
}

/** The id of whichever semester in a session is currently 'ongoing', or null if none is. Used purely to highlight the active semester in the UI — not a fallback/inference like getCurrentAcademicYear above. */
export function getCurrentSemesterId(session: AcademicSessionSummary): string | null {
  return session.semesters.find((s) => s.status === "ongoing")?.id ?? null;
}

// ---------------------------------------------------------------
// Level 3 — Semester detail, courses grouped by discipline
// ---------------------------------------------------------------

export interface SemesterCourseRow {
  offeringId: string;
  offeringStatus: string;
  courseCode: string;
  courseName: string;
  creditHours: number;
  degreeLevel: DegreeLevel | null;
  degreeLevelSource: DegreeLevelSource;
  /** id + display name per assigned faculty member — the id is needed to link into that faculty's teaching history; kept as objects rather than pre-joined strings so the UI can filter/link per-faculty. */
  faculty: { id: string; name: string }[];
  studentCount: number;
}

export interface DisciplineGroup {
  department: { id: string; code: string; name: string };
  courses: SemesterCourseRow[];
}

export interface SemesterDetail {
  semester: SemesterSummary;
  academicYear: string;
  disciplines: DisciplineGroup[];
  msPhilCourseCount: number;
  phdCourseCount: number;
}

export async function getSemesterDetail(semesterId: string): Promise<SemesterDetail | null> {
  const rows = await fetchRawOfferingsForSemester(semesterId);
  if (rows.length === 0) {
    // Still resolve the semester itself, even with zero offerings — an
    // empty semester is a valid state to view, not a 404.
    const supabase = await createClient();
    const { data } = await supabase
      .from("semesters")
      .select("id, name, academic_year, start_date, end_date, status")
      .eq("id", semesterId)
      .maybeSingle();
    if (!data) return null;
    return {
      semester: {
        id: data.id,
        name: data.name,
        status: data.status,
        startDate: data.start_date,
        endDate: data.end_date,
        offeringCount: 0,
        totalCreditHours: 0,
        facultyCount: 0,
        studentCount: 0,
      },
      academicYear: data.academic_year,
      disciplines: [],
      msPhilCourseCount: 0,
      phdCourseCount: 0,
    };
  }

  const active = rows.filter((r) => isReportableOffering(r.status));
  const byDept = new Map<string, { department: RawOfferingRow["course"]["department"]; rows: RawOfferingRow[] }>();
  const facultyIds = new Set<string>();
  let msPhilCount = 0;
  let phdCount = 0;

  for (const row of active) {
    const dept = row.course.department;
    if (!byDept.has(dept.id)) byDept.set(dept.id, { department: dept, rows: [] });
    byDept.get(dept.id)!.rows.push(row);
    for (const a of row.course_offering_faculty) facultyIds.add(a.faculty.id);
    const { level } = courseDegreeLevel(row.course);
    if (level === "master") msPhilCount++;
    if (level === "phd") phdCount++;
  }

  /**
   * Every known discipline is shown, not just ones with an offering this
   * semester — a discipline with zero courses is a real, distinct empty
   * state ("no courses have been offered in this discipline this
   * semester"), not an absence to silently hide. Fetched regardless of
   * departments.status, matching this module's historical-reporting
   * design: a since-deactivated department's past offerings must still
   * show under its own section.
   */
  const supabaseForDepartments = await createClient();
  const { data: allDepartments } = await supabaseForDepartments
    .from("departments")
    .select("id, code, name")
    .order("name");

  const departmentList: RawOfferingRow["course"]["department"][] =
    allDepartments && allDepartments.length > 0
      ? allDepartments
      : [...byDept.values()].map((v) => v.department);

  const disciplines: DisciplineGroup[] = departmentList
    .map((department) => {
      const deptRows = byDept.get(department.id)?.rows ?? [];
      return {
        department,
        courses: deptRows
          .map((row) => {
            const { level, source } = courseDegreeLevel(row.course);
            return {
              offeringId: row.id,
              offeringStatus: row.status,
              courseCode: row.course.code,
              courseName: row.course.name,
              creditHours: courseCreditHours(row.course),
              degreeLevel: level,
              degreeLevelSource: source,
              faculty: row.course_offering_faculty.map((a) => ({
                id: a.faculty.id,
                name: facultyDisplayName(a.faculty),
              })),
              studentCount: reportableEnrollments(row).length,
            };
          })
          .sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
      };
    })
    .sort((a, b) => a.department.name.localeCompare(b.department.name));

  const meta = rows[0].semester;
  const distinctStudents = new Set<string>();
  for (const r of active) for (const e of reportableEnrollments(r)) distinctStudents.add(e.student_id);
  const studentCount = distinctStudents.size;

  return {
    semester: {
      id: meta.id,
      name: meta.name,
      status: meta.status,
      startDate: meta.start_date,
      endDate: meta.end_date,
      offeringCount: active.length,
      totalCreditHours: sumCreditHours(active),
      facultyCount: facultyIds.size,
      studentCount,
    },
    academicYear: meta.academic_year,
    disciplines,
    msPhilCourseCount: msPhilCount,
    phdCourseCount: phdCount,
  };
}

// ---------------------------------------------------------------
// Semester Operations dashboard — the operational (not purely
// historical-reporting) view of one semester: every offering status
// (not just reportable ones), faculty-assignment coverage, enrollment
// status breakdown, and data-quality flags. getSemesterDetail() above
// deliberately only shows reportable (open/closed) offerings, since it
// backs the historical reporting layer; this function is for the
// "is this semester ready" operational question, where a management user
// genuinely needs to see planned/cancelled offerings and incomplete
// records too. Built on the same fetchRawOfferingsForSemester() rows and
// the same shared reporting-policy helpers — no second CH/enrollment/
// degree-level calculation.
// ---------------------------------------------------------------

export interface DataQualityIssue {
  message: string;
  count: number;
  severity: "warning" | "info";
  href: string;
}

export interface SemesterOperationsData {
  semester: SemesterSummary;
  academicYear: string;
  catalogue: {
    totalActiveCourses: number;
    msPhilCourses: number;
    phdCourses: number;
    offeredThisSemester: number;
  };
  offerings: {
    total: number;
    open: number;
    closed: number;
    planned: number;
    cancelled: number;
    reportable: number;
    withoutFaculty: number;
    withOneFaculty: number;
    withMultipleFaculty: number;
    withoutStudents: number;
  };
  faculty: {
    distinctTeaching: number;
  };
  students: {
    totalActiveInstitution: number;
    distinctEnrolled: number;
    msPhilEnrolled: number;
    phdEnrolled: number;
    enrolledInOneCourse: number;
    enrolledInTwoCourses: number;
    enrolledInThreeOrMoreCourses: number;
    withNoEnrollment: number;
  };
  enrollments: {
    total: number;
    active: number;
    completed: number;
    dropped: number;
    failed: number;
  };
  dataQuality: DataQualityIssue[];
}

export async function getSemesterOperations(semesterId: string): Promise<SemesterOperationsData | null> {
  const supabase = await createClient();
  const { data: semesterMeta } = await supabase
    .from("semesters")
    .select("id, name, academic_year, start_date, end_date, status")
    .eq("id", semesterId)
    .maybeSingle();
  if (!semesterMeta) return null;

  const allRows = await fetchRawOfferingsForSemester(semesterId);
  const reportableRows = allRows.filter((r) => isReportableOffering(r.status));
  const nonCancelledRows = allRows.filter((r) => r.status !== "cancelled");

  // Catalogue-wide totals (independent of this semester) — same
  // structural/code-fallback classification as everywhere else.
  const { data: allCoursesRaw } = await supabase
    .from("courses")
    .select("id, code, program_courses ( program:programs ( degree_level ) )")
    .eq("status", "active");
  const catalogueCourses = (allCoursesRaw ?? []) as unknown as {
    id: string;
    code: string;
    program_courses: { program: { degree_level: DegreeLevel } | null }[] | null;
  }[];
  let msPhilCourses = 0;
  let phdCourses = 0;
  for (const c of catalogueCourses) {
    const { level } = courseDegreeLevel(c);
    if (level === "master") msPhilCourses++;
    if (level === "phd") phdCourses++;
  }

  const offeredCourseIds = new Set(reportableRows.map((r) => r.course.id));

  let open = 0;
  let closed = 0;
  let planned = 0;
  let cancelled = 0;
  for (const r of allRows) {
    if (r.status === "open") open++;
    else if (r.status === "closed") closed++;
    else if (r.status === "planned") planned++;
    else if (r.status === "cancelled") cancelled++;
  }

  let withoutFaculty = 0;
  let withOneFaculty = 0;
  let withMultipleFaculty = 0;
  for (const r of nonCancelledRows) {
    const n = r.course_offering_faculty.length;
    if (n === 0) withoutFaculty++;
    else if (n === 1) withOneFaculty++;
    else withMultipleFaculty++;
  }

  const withoutStudents = reportableRows.filter((r) => reportableEnrollments(r).length === 0).length;

  const facultyIds = new Set<string>();
  for (const r of reportableRows) for (const a of r.course_offering_faculty) facultyIds.add(a.faculty.id);

  let enrTotal = 0;
  let enrActive = 0;
  let enrCompleted = 0;
  let enrDropped = 0;
  let enrFailed = 0;
  let enrollmentsInCancelledOfferings = 0;
  for (const r of allRows) {
    for (const e of r.enrollments ?? []) {
      enrTotal++;
      if (e.status === "active") enrActive++;
      else if (e.status === "completed") enrCompleted++;
      else if (e.status === "dropped") enrDropped++;
      else if (e.status === "failed") enrFailed++;
      if (r.status === "cancelled") enrollmentsInCancelledOfferings++;
    }
  }

  const perStudentCourseCount = new Map<string, number>();
  const distinctEnrolled = new Set<string>();
  for (const r of reportableRows) {
    for (const e of reportableEnrollments(r)) {
      distinctEnrolled.add(e.student_id);
      perStudentCourseCount.set(e.student_id, (perStudentCourseCount.get(e.student_id) ?? 0) + 1);
    }
  }
  let enrolledInOneCourse = 0;
  let enrolledInTwoCourses = 0;
  let enrolledInThreeOrMoreCourses = 0;
  for (const count of perStudentCourseCount.values()) {
    if (count === 1) enrolledInOneCourse++;
    else if (count === 2) enrolledInTwoCourses++;
    else enrolledInThreeOrMoreCourses++;
  }

  const { data: activeStudentsRaw } = await supabase
    .from("students")
    .select("id, program:programs!inner ( degree_level )")
    .eq("status", "active");
  const activeStudents = (activeStudentsRaw ?? []) as unknown as { id: string; program: { degree_level: DegreeLevel } }[];
  const activeStudentIds = new Set(activeStudents.map((s) => s.id));
  const degreeLevelByStudent = new Map(activeStudents.map((s) => [s.id, s.program.degree_level]));

  let msPhilEnrolled = 0;
  let phdEnrolled = 0;
  for (const studentId of distinctEnrolled) {
    const level = degreeLevelByStudent.get(studentId);
    if (level === "master") msPhilEnrolled++;
    if (level === "phd") phdEnrolled++;
  }

  let withNoEnrollment = 0;
  let enrollmentsForInactiveStudents = 0;
  for (const id of activeStudentIds) if (!distinctEnrolled.has(id)) withNoEnrollment++;
  for (const r of allRows) {
    for (const e of r.enrollments ?? []) {
      if (!activeStudentIds.has(e.student_id)) enrollmentsForInactiveStudents++;
    }
  }

  const offeringsPerCourse = new Map<string, number>();
  for (const r of allRows) offeringsPerCourse.set(r.course.id, (offeringsPerCourse.get(r.course.id) ?? 0) + 1);
  const duplicateCourseOfferingCount = [...offeringsPerCourse.values()].filter((n) => n > 1).length;

  let inferredDegreeLevelCount = 0;
  let unknownDegreeLevelCount = 0;
  for (const r of reportableRows) {
    const { source } = courseDegreeLevel(r.course);
    if (source === "course-code") inferredDegreeLevelCount++;
    if (source === "unknown") unknownDegreeLevelCount++;
  }

  const zeroCreditHourCount = reportableRows.filter((r) => courseCreditHours(r.course) === 0).length;

  const semesterHref = `/management/semesters/${semesterId}`;
  const studentsHref = `/management/semesters/${semesterId}/students`;
  const dataQuality: DataQualityIssue[] = [];
  const push = (condition: number, message: (n: number) => string, severity: DataQualityIssue["severity"], href: string) => {
    if (condition > 0) dataQuality.push({ message: message(condition), count: condition, severity, href });
  };

  push(withoutFaculty, (n) => `${n} offering${n === 1 ? " has" : "s have"} no faculty assigned`, "warning", semesterHref);
  push(withoutStudents, (n) => `${n} offering${n === 1 ? " has" : "s have"} no students enrolled`, "warning", semesterHref);
  push(withNoEnrollment, (n) => `${n} active student${n === 1 ? " has" : "s have"} no enrollment this semester (institution-wide)`, "info", studentsHref);
  push(duplicateCourseOfferingCount, (n) => `${n} course${n === 1 ? " has" : "s have"} more than one offering this semester`, "warning", semesterHref);
  push(planned, (n) => `${n} offering${n === 1 ? " is" : "s are"} still marked Planned — excluded from official totals until Open/Closed`, "info", semesterHref);
  push(cancelled, (n) => `${n} offering${n === 1 ? " is" : "s are"} cancelled — excluded from official totals`, "info", semesterHref);
  push(zeroCreditHourCount, (n) => `${n} offering${n === 1 ? " references" : "s reference"} a course with 0 credit hours`, "warning", semesterHref);
  push(withMultipleFaculty, (n) => `${n} offering${n === 1 ? " has" : "s have"} multiple faculty assigned (co-teaching)`, "info", semesterHref);
  push(inferredDegreeLevelCount, (n) => `${n} course${n === 1 ? " has" : "s have"} a degree level inferred only from the course-number convention, not program linkage`, "info", semesterHref);
  push(unknownDegreeLevelCount, (n) => `${n} course${n === 1 ? " has" : "s have"} an unknown degree level`, "warning", semesterHref);
  push(enrollmentsInCancelledOfferings, (n) => `${n} enrollment${n === 1 ? " belongs" : "s belong"} to a cancelled offering`, "warning", semesterHref);
  push(enrollmentsForInactiveStudents, (n) => `${n} enrollment${n === 1 ? " references" : "s reference"} a student who is not currently active`, "warning", studentsHref);

  return {
    semester: {
      id: semesterMeta.id,
      name: semesterMeta.name,
      status: semesterMeta.status,
      startDate: semesterMeta.start_date,
      endDate: semesterMeta.end_date,
      offeringCount: reportableRows.length,
      totalCreditHours: sumCreditHours(reportableRows),
      facultyCount: facultyIds.size,
      studentCount: distinctEnrolled.size,
    },
    academicYear: semesterMeta.academic_year,
    catalogue: {
      totalActiveCourses: catalogueCourses.length,
      msPhilCourses,
      phdCourses,
      offeredThisSemester: offeredCourseIds.size,
    },
    offerings: {
      total: allRows.length,
      open,
      closed,
      planned,
      cancelled,
      reportable: reportableRows.length,
      withoutFaculty,
      withOneFaculty,
      withMultipleFaculty,
      withoutStudents,
    },
    faculty: { distinctTeaching: facultyIds.size },
    students: {
      totalActiveInstitution: activeStudentIds.size,
      distinctEnrolled: distinctEnrolled.size,
      msPhilEnrolled,
      phdEnrolled,
      enrolledInOneCourse,
      enrolledInTwoCourses,
      enrolledInThreeOrMoreCourses,
      withNoEnrollment,
    },
    enrollments: { total: enrTotal, active: enrActive, completed: enrCompleted, dropped: enrDropped, failed: enrFailed },
    dataQuality,
  };
}

// ---------------------------------------------------------------
// Semester student overview — one row per distinct student enrolled in
// this semester (reportable enrollments only), with their courses this
// semester and total CH, PLUS their degree-level academic-progress summary
// (stage/milestones/supervisor/coursework CH) pulled from the existing
// status-engine/degree-audit/progression-rules engines. A semester-scoped
// view over the same students/enrollments data, not a parallel
// student-management or academic-progress system — the semester-enrollment
// fields (courses, totalCreditHours) and the degree-progress fields
// (academicStage, milestones*, requiredCH/completedCH) intentionally answer
// different questions (see class doc on SemesterStudentRow) and must not be
// conflated: a student can appear in several semesters, but their
// academic-progress fields are always their current, cumulative,
// degree-level state, not scoped to this one semester.
// ---------------------------------------------------------------

export interface SemesterStudentCourseRow {
  offeringId: string;
  code: string;
  name: string;
  creditHours: number;
  /** The enrollment's own status — always one of the reportable statuses (active/completed/failed) here, since a dropped enrollment is excluded before this row is built. */
  enrollmentStatus: string;
}

export interface SemesterStudentRow {
  id: string;
  name: string;
  email: string | null;
  studentNumber: string;
  status: string;
  program: { name: string; degreeLevel: DegreeLevel } | null;
  discipline: { id: string; name: string } | null;
  courses: SemesterStudentCourseRow[];
  totalCreditHours: number;
  /**
   * Degree-level academic-progress fields, added alongside the existing
   * semester-enrollment fields above (which are NOT the same thing — see
   * the module doc on getSemesterStudentsOverview). Every value here comes
   * from calling the existing status-engine/degree-audit/progression-rules
   * functions per student (the same engines the Academic Progress pages
   * use) — no new calculation. null when the underlying engine itself
   * returns null (e.g. no program on record), never a guessed default.
   */
  supervisorName: string | null;
  academicStage: OverallStage | null;
  milestonesCompleted: number | null;
  milestonesRequired: number | null;
  overallStatusLabel: StudentStatusLabel | null;
  requiredCH: number | null;
  completedCH: number;
}

export interface SemesterStudentsOverview {
  academicYear: string;
  semesterName: string;
  students: SemesterStudentRow[];
}

export async function getSemesterStudentsOverview(semesterId: string): Promise<SemesterStudentsOverview | null> {
  const supabase = await createClient();
  const { data: semesterMeta } = await supabase
    .from("semesters")
    .select("academic_year, name")
    .eq("id", semesterId)
    .maybeSingle();
  if (!semesterMeta) return null;

  const rows = (await fetchRawOfferingsForSemester(semesterId)).filter((r) => isReportableOffering(r.status));

  const byStudent = new Map<string, SemesterStudentCourseRow[]>();
  for (const r of rows) {
    for (const e of reportableEnrollments(r)) {
      if (!byStudent.has(e.student_id)) byStudent.set(e.student_id, []);
      byStudent.get(e.student_id)!.push({
        offeringId: r.id,
        code: r.course.code,
        name: r.course.name,
        creditHours: courseCreditHours(r.course),
        enrollmentStatus: e.status,
      });
    }
  }

  if (byStudent.size === 0) {
    return { academicYear: semesterMeta.academic_year, semesterName: semesterMeta.name, students: [] };
  }

  const { data: studentRows } = await supabase
    .from("students")
    .select(
      `id, name, email, student_number, status, phd_entry_basis,
       profile:profiles ( full_name, email ),
       program:programs ( name, degree_level, department:departments ( id, name ) )`
    )
    .in("id", [...byStudent.keys()]);

  const raw = (studentRows ?? []) as unknown as {
    id: string;
    name: string;
    email: string | null;
    student_number: string;
    status: string;
    phd_entry_basis: PhdEntryBasis | null;
    profile: { full_name: string; email: string } | null;
    program: { name: string; degree_level: DegreeLevel; department: { id: string; name: string } | null } | null;
  }[];

  // Bounded per-student enrichment — one semester's roster (never
  // paginated to begin with, same reasoning as SemesterCourseExplorer),
  // not an institution-wide fetch. Every value here is produced by calling
  // the existing engines, never a second calculation.
  const students: SemesterStudentRow[] = await Promise.all(
    raw.map(async (s) => {
      const courses = byStudent.get(s.id) ?? [];
      const program = s.program ? { name: s.program.name, degreeLevel: s.program.degree_level } : null;

      const [status, audit, supervisorHistory] = await Promise.all([
        getStudentAcademicStatus(s.id),
        getStudentDegreeAudit(s.id),
        getSupervisorAssignmentsForStudent(s.id),
      ]);
      const activeSupervisor = supervisorHistory.find((a) => a.status === "active" && a.role === "supervisor");

      return {
        id: s.id,
        name: s.profile?.full_name ?? s.name,
        email: s.profile?.email ?? s.email,
        studentNumber: s.student_number,
        status: s.status,
        program,
        discipline: s.program?.department ?? null,
        courses,
        totalCreditHours: courses.reduce((sum, c) => sum + c.creditHours, 0),
        supervisorName: activeSupervisor?.faculty.name ?? null,
        academicStage: status ? deriveOverallStage(status) : null,
        milestonesCompleted: status ? status.completedMilestones.length : null,
        milestonesRequired: status ? status.requiredMilestones.length : null,
        overallStatusLabel: status ? status.statusLabel : null,
        requiredCH: program ? getRequiredCourseworkCreditHours(program.degreeLevel, s.phd_entry_basis) : null,
        completedCH: audit?.creditHourBreakdown.completedCreditHours ?? 0,
      };
    })
  );
  students.sort((a, b) => a.name.localeCompare(b.name));

  return { academicYear: semesterMeta.academic_year, semesterName: semesterMeta.name, students };
}

// ---------------------------------------------------------------
// Faculty perspective — Session -> Semester -> Courses for one faculty
// ---------------------------------------------------------------

export interface FacultyCourseRow {
  offeringId: string;
  code: string;
  name: string;
  discipline: { id: string; name: string };
  degreeLevel: DegreeLevel | null;
  creditHours: number;
  studentCount: number;
  /** This offering's own status (open/closed/planned/cancelled) — already filtered to reportable (open/closed) offerings before this row is built, but kept here rather than assumed by the UI. */
  offeringStatus: string;
  /** This faculty member's own role on this particular offering (primary/co_instructor/lab_instructor) — not the whole assignment list, since a row here is already scoped to one faculty member. */
  role: string | null;
}

export interface FacultySemesterCourses {
  semesterId: string;
  semesterName: string;
  courses: FacultyCourseRow[];
}

export interface FacultySessionCourses {
  academicYear: string;
  semesters: FacultySemesterCourses[];
  totalCourses: number;
  totalCreditHours: number;
  /** Distinct students taught by this faculty member across all their offerings in this session — same reportable-enrollment dedup rule as everywhere else in this module, just scoped to one academic year instead of the faculty member's lifetime total. */
  totalStudents: number;
}

export interface FacultyTeachingHistory {
  facultyId: string;
  facultyName: string;
  sessions: FacultySessionCourses[];
  totalCourses: number;
  totalCreditHours: number;
  totalStudents: number;
}

/**
 * Per-faculty CH here is legitimate (each faculty member gets credit for
 * the offering they're assigned to) — see reporting-policy.ts's
 * INSTITUTION_WIDE_CH_NOTE before ever summing this *across* faculty to
 * produce a single institution-wide total, which would double-count
 * co-taught offerings.
 */
export async function getFacultyTeachingHistory(facultyId: string): Promise<FacultyTeachingHistory | null> {
  const rows = (await fetchRawOfferings()).filter(
    (r) => isReportableOffering(r.status) && r.course_offering_faculty.some((a) => a.faculty.id === facultyId)
  );

  const supabase = await createClient();
  const { data: facultyRow } = await supabase
    .from("faculty")
    .select("name, profile:profiles(full_name)")
    .eq("id", facultyId)
    .maybeSingle();
  if (!facultyRow) return null;

  const facultyName = (facultyRow as unknown as { name: string; profile: { full_name: string } | null }).profile
    ?.full_name ?? (facultyRow as unknown as { name: string }).name;

  const byYear = new Map<string, Map<string, RawOfferingRow[]>>();
  for (const row of rows) {
    const year = row.semester.academic_year;
    if (!byYear.has(year)) byYear.set(year, new Map());
    const bySem = byYear.get(year)!;
    if (!bySem.has(row.semester.id)) bySem.set(row.semester.id, []);
    bySem.get(row.semester.id)!.push(row);
  }

  const sessions: FacultySessionCourses[] = [];
  const distinctStudentsTaught = new Set<string>();
  let totalCourses = 0;
  let totalCreditHours = 0;

  for (const [academicYear, bySem] of byYear) {
    const semesters: FacultySemesterCourses[] = [];
    const sessionStudents = new Set<string>();
    for (const [semesterId, offeringRows] of bySem) {
      semesters.push({
        semesterId,
        semesterName: offeringRows[0].semester.name,
        courses: offeringRows.map((row) => ({
          offeringId: row.id,
          code: row.course.code,
          name: row.course.name,
          discipline: { id: row.course.department.id, name: row.course.department.name },
          degreeLevel: courseDegreeLevel(row.course).level,
          creditHours: courseCreditHours(row.course),
          studentCount: reportableEnrollments(row).length,
          offeringStatus: row.status,
          role: row.course_offering_faculty.find((a) => a.faculty.id === facultyId)?.role ?? null,
        })),
      });
      totalCourses += offeringRows.length;
      for (const row of offeringRows) {
        for (const e of reportableEnrollments(row)) {
          distinctStudentsTaught.add(e.student_id);
          sessionStudents.add(e.student_id);
        }
      }
    }
    semesters.sort((a, b) => a.semesterName.localeCompare(b.semesterName));
    const sessionCourseCount = semesters.reduce((sum, s) => sum + s.courses.length, 0);
    const sessionCreditHours = semesters.reduce(
      (sum, s) => sum + s.courses.reduce((cSum, c) => cSum + c.creditHours, 0),
      0
    );
    totalCreditHours += sessionCreditHours;
    sessions.push({
      academicYear,
      semesters,
      totalCourses: sessionCourseCount,
      totalCreditHours: sessionCreditHours,
      totalStudents: sessionStudents.size,
    });
  }

  sessions.sort((a, b) => a.academicYear.localeCompare(b.academicYear));

  return {
    facultyId,
    facultyName,
    sessions,
    totalCourses,
    totalCreditHours,
    totalStudents: distinctStudentsTaught.size,
  };
}
