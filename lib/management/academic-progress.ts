import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getStudentAcademicStatus,
  deriveOverallStage,
  STUDENT_STATUS_LABELS,
  OVERALL_STAGES,
  type StudentStatusLabel,
  type OverallStage,
} from "@/lib/academic/status-engine";
import { getAcademicSessionsOverview, getCurrentAcademicYear } from "@/lib/management/academic-sessions";
import { STUDENT_STATUSES, type StudentStatus } from "@/lib/management/status-enums";
import {
  type RawSearchParams,
  firstValue,
  parsePage,
  parseEnumValue,
  parseUuid,
  parseText,
  escapeIlike,
  UUID_RE,
} from "@/lib/management/query-params";

export const ACADEMIC_PROGRESS_PAGE_SIZE = 25;

/**
 * Safety ceiling for the "slow path" below (a Stage or Overall Status
 * filter applied) — same RAW_FETCH_LIMIT-style bounded-fetch pattern
 * already established in lib/management/academic-sessions.ts and
 * reports/teaching-load.ts for the same underlying reason: Stage/Status
 * are computed values (from milestone records), not a database column, so
 * they can't be filtered via a WHERE clause. This bounds the computation
 * to a realistic institution-wide active-student count rather than being
 * unbounded; if it's ever hit, the count is reported as capped rather
 * than silently wrong (see the `capped` field on the result).
 */
const STAGE_FILTER_FETCH_CAP = 500;

export interface StudentProgressSummaryRow {
  id: string;
  student_number: string;
  full_name: string;
  program_id: string;
  program_name: string;
  degree_level: string;
  department_name: string;
  admission_year: number;
  studentStatus: StudentStatus;
  supervisorName: string | null;
  statusLabel: StudentStatusLabel | null;
  currentStage: OverallStage | null;
  progressPercentage: number | null;
  completedCount: number;
  totalRequiredCount: number;
  overdueCount: number;
  requiresAdministrativeAction: boolean;
}

export interface AcademicProgressFilters {
  q: string;
  degreeLevel: string;
  departmentId: string;
  programId: string;
  /** "" = use the current academic session by default (see getAcademicProgressOverview); "all" = no session restriction. */
  academicYear: string;
  studentStatus: StudentStatus | "";
  supervisorId: string;
  stage: OverallStage | "";
  statusLabel: StudentStatusLabel | "";
  page: number;
}

export interface AcademicProgressOverview {
  totalStudents: number;
  byStatusLabel: Record<StudentStatusLabel, number>;
  requiringAction: number;
  students: StudentProgressSummaryRow[];
  count: number;
  page: number;
  /** True only when the Stage/Status filter path hit STAGE_FILTER_FETCH_CAP — the result is then a partial view of a larger matching set, surfaced rather than silently presented as complete. */
  capped: boolean;
  currentAcademicYear: string | null;
  error: string | null;
}

export interface AcademicProgressFilterOptions {
  departments: { id: string; name: string }[];
  programs: { id: string; name: string; department_id: string; degree_level: string }[];
  academicYears: string[];
  supervisors: { id: string; name: string }[];
}

const DEGREE_LEVELS_FOR_PROGRESS = ["master", "phd"] as const;

export function parseAcademicProgressFilters(searchParams: RawSearchParams): AcademicProgressFilters {
  return {
    q: parseText(searchParams.q),
    degreeLevel: parseEnumValue(searchParams.degree, DEGREE_LEVELS_FOR_PROGRESS),
    departmentId: parseUuid(searchParams.department),
    programId: parseUuid(searchParams.program),
    academicYear: firstValue(searchParams.session).trim().slice(0, 20),
    studentStatus: parseEnumValue(searchParams.status, STUDENT_STATUSES),
    supervisorId: parseUuid(searchParams.supervisor),
    stage: parseEnumValue(searchParams.stage, OVERALL_STAGES),
    statusLabel: parseEnumValue(searchParams.overall, STUDENT_STATUS_LABELS),
    page: parsePage(searchParams.page),
  };
}

export function hasActiveAcademicProgressFilters(filters: AcademicProgressFilters, currentAcademicYear: string | null): boolean {
  return Boolean(
    filters.q ||
      filters.degreeLevel ||
      filters.departmentId ||
      filters.programId ||
      filters.studentStatus ||
      filters.supervisorId ||
      filters.stage ||
      filters.statusLabel ||
      (filters.academicYear && filters.academicYear !== (currentAcademicYear ?? ""))
  );
}

export function buildAcademicProgressHref(filters: AcademicProgressFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.degreeLevel) params.set("degree", filters.degreeLevel);
  if (filters.departmentId) params.set("department", filters.departmentId);
  if (filters.programId) params.set("program", filters.programId);
  if (filters.academicYear) params.set("session", filters.academicYear);
  if (filters.studentStatus) params.set("status", filters.studentStatus);
  if (filters.supervisorId) params.set("supervisor", filters.supervisorId);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.statusLabel) params.set("overall", filters.statusLabel);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/academic-progress?${qs}` : "/management/academic-progress";
}

export async function getAcademicProgressFilterOptions(): Promise<AcademicProgressFilterOptions> {
  const supabase = await createClient();

  const [departmentsRes, programsRes, supervisorsRes, sessions] = await Promise.all([
    supabase.from("departments").select("id, name").eq("status", "active").order("name"),
    supabase.from("programs").select("id, name, department_id, degree_level").eq("status", "active").order("name"),
    supabase.from("faculty").select("id, name, profile:profiles(full_name)").eq("status", "active").order("name"),
    getAcademicSessionsOverview(),
  ]);

  if (departmentsRes.error) console.error("getAcademicProgressFilterOptions departments failed:", departmentsRes.error);
  if (programsRes.error) console.error("getAcademicProgressFilterOptions programs failed:", programsRes.error);
  if (supervisorsRes.error) console.error("getAcademicProgressFilterOptions supervisors failed:", supervisorsRes.error);

  const supervisors = ((supervisorsRes.data ?? []) as unknown as { id: string; name: string; profile: { full_name: string } | null }[])
    .map((f) => ({ id: f.id, name: f.profile?.full_name ?? f.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    departments: departmentsRes.data ?? [],
    programs: programsRes.data ?? [],
    academicYears: sessions.map((s) => s.academicYear).reverse(),
    supervisors,
  };
}

interface RawStudentRow {
  id: string;
  student_number: string;
  admission_year: number;
  status: StudentStatus;
  profile: { full_name: string } | null;
  name: string;
  program: { id: string; name: string; degree_level: string; department: { id: string; name: string } } | null;
}

const PROGRESS_STUDENT_SELECT = `
  id, student_number, admission_year, status, name,
  profile:profiles ( full_name ),
  program:programs!inner ( id, name, degree_level, department:departments!inner ( id, name ) )
`;

/** Distinct student_ids with a reportable enrollment in a course_offering within the given academic_year — used for the (default-to-current) academic session filter. Bounded: one session's enrollments, never institution-history-scale. */
async function getStudentIdsEnrolledInSession(academicYear: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select("student_id, course_offering:course_offerings!inner ( status, semester:semesters!inner ( academic_year ) )")
    .in("status", ["active", "completed", "failed"])
    .eq("course_offering.semester.academic_year", academicYear);

  if (error) {
    console.error("getStudentIdsEnrolledInSession failed:", error);
    return new Set();
  }
  const rows = (data ?? []) as unknown as { student_id: string; course_offering: { status: string } }[];
  return new Set(rows.filter((r) => r.course_offering.status === "open" || r.course_offering.status === "closed").map((r) => r.student_id));
}

/** Active supervisor_assignments for one faculty member — student_ids currently supervised, for the supervisor filter. */
async function getStudentIdsSupervisedBy(facultyId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supervisor_assignments")
    .select("student_id")
    .eq("faculty_id", facultyId)
    .eq("status", "active");

  if (error) {
    console.error("getStudentIdsSupervisedBy failed:", error);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.student_id));
}

/** Active supervisor (role='supervisor') display names for a batch of students — one query, not N+1. */
async function getActiveSupervisorNamesByStudent(studentIds: string[]): Promise<Map<string, string>> {
  if (studentIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supervisor_assignments")
    .select("student_id, faculty:faculty!inner ( name, profile:profiles ( full_name ) )")
    .in("student_id", studentIds)
    .eq("role", "supervisor")
    .eq("status", "active");

  if (error) {
    console.error("getActiveSupervisorNamesByStudent failed:", error);
    return new Map();
  }
  const rows = (data ?? []) as unknown as { student_id: string; faculty: { name: string; profile: { full_name: string } | null } }[];
  return new Map(rows.map((r) => [r.student_id, r.faculty.profile?.full_name ?? r.faculty.name]));
}

function normalizeRow(
  r: RawStudentRow,
  status: Awaited<ReturnType<typeof getStudentAcademicStatus>>,
  supervisorName: string | null
): StudentProgressSummaryRow {
  return {
    id: r.id,
    student_number: r.student_number,
    full_name: r.profile?.full_name ?? r.name,
    program_id: r.program?.id ?? "",
    program_name: r.program?.name ?? "—",
    degree_level: r.program?.degree_level ?? "—",
    department_name: r.program?.department.name ?? "—",
    admission_year: r.admission_year,
    studentStatus: r.status,
    supervisorName,
    statusLabel: status?.statusLabel ?? null,
    currentStage: status ? deriveOverallStage(status) : null,
    progressPercentage: status?.progressPercentage ?? null,
    completedCount: status?.completedMilestones.length ?? 0,
    totalRequiredCount: status?.requiredMilestones.length ?? 0,
    overdueCount: status?.overdueMilestones.length ?? 0,
    requiresAdministrativeAction: status?.requiresAdministrativeAction ?? false,
  };
}

function emptyByStatusLabel(): Record<StudentStatusLabel, number> {
  return STUDENT_STATUS_LABELS.reduce((acc, label) => ({ ...acc, [label]: 0 }), {} as Record<StudentStatusLabel, number>);
}

/**
 * The Academic Progress landing-page query. Applies every cheap (real
 * database column) filter server-side first — degree level, discipline,
 * program, student status, supervisor, academic session, search — then
 * takes one of two paths:
 *
 *  - Fast path (no Stage/Overall Status filter): real count+range
 *    pagination, and getStudentAcademicStatus() (milestones+extensions,
 *    the same function the existing status-engine already exposes) is
 *    computed only for the current page's ~25 rows, never the whole
 *    matching set.
 *  - Slow path (Stage or Overall Status filter present): those are
 *    computed values with no database column to filter on, so this
 *    fetches up to STAGE_FILTER_FETCH_CAP cheap-filtered students,
 *    computes status for all of them, filters, then paginates the
 *    filtered array in memory — the same bounded-fetch pattern already
 *    used elsewhere in this codebase for the identical PostgREST
 *    limitation (no aggregate/computed-column filtering).
 *
 * Defaults to the current academic session (via the existing
 * getCurrentAcademicYear() — never a second "what's current" definition)
 * unless the caller explicitly passes academicYear: "all" or a specific
 * year.
 */
export async function getAcademicProgressOverview(filters: AcademicProgressFilters): Promise<AcademicProgressOverview> {
  const supabase = await createClient();

  const sessions = await getAcademicSessionsOverview();
  const currentAcademicYear = getCurrentAcademicYear(sessions);
  const effectiveYear = filters.academicYear === "all" ? "" : filters.academicYear || currentAcademicYear || "";

  const [sessionStudentIds, supervisedStudentIds] = await Promise.all([
    effectiveYear ? getStudentIdsEnrolledInSession(effectiveYear) : Promise.resolve<Set<string> | null>(null),
    filters.supervisorId ? getStudentIdsSupervisedBy(filters.supervisorId) : Promise.resolve<Set<string> | null>(null),
  ]);

  if ((effectiveYear && sessionStudentIds!.size === 0) || (filters.supervisorId && supervisedStudentIds!.size === 0)) {
    return {
      totalStudents: 0,
      byStatusLabel: emptyByStatusLabel(),
      requiringAction: 0,
      students: [],
      count: 0,
      page: filters.page,
      capped: false,
      currentAcademicYear,
      error: null,
    };
  }

  function applyCheapFilters<T>(query: T): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = query as any;
    q = q.eq("status", filters.studentStatus || "active");
    if (filters.degreeLevel) q = q.eq("program.degree_level", filters.degreeLevel);
    if (filters.departmentId) q = q.eq("program.department_id", filters.departmentId);
    if (filters.programId) q = q.eq("program_id", filters.programId);
    if (sessionStudentIds) q = q.in("id", [...sessionStudentIds]);
    if (supervisedStudentIds) q = q.in("id", [...supervisedStudentIds]);
    if (filters.q) {
      const escaped = escapeIlike(filters.q);
      q = q.or(`name.ilike.%${escaped}%,student_number.ilike.%${escaped}%`);
    }
    return q as T;
  }

  const needsComputedFilter = Boolean(filters.stage || filters.statusLabel);

  if (!needsComputedFilter) {
    const countQuery = applyCheapFilters(
      supabase.from("students").select("id, program:programs!inner(id)", { count: "exact", head: true })
    );
    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error("getAcademicProgressOverview count query failed:", countError);
      return {
        totalStudents: 0,
        byStatusLabel: emptyByStatusLabel(),
        requiringAction: 0,
        students: [],
        count: 0,
        page: filters.page,
        capped: false,
        currentAcademicYear,
        error: "Could not load academic progress overview.",
      };
    }

    const totalCount = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / ACADEMIC_PROGRESS_PAGE_SIZE));
    const safePage = Math.min(Math.max(filters.page, 1), totalPages);
    const from = (safePage - 1) * ACADEMIC_PROGRESS_PAGE_SIZE;
    const to = from + ACADEMIC_PROGRESS_PAGE_SIZE - 1;

    const dataQuery = applyCheapFilters(supabase.from("students").select(PROGRESS_STUDENT_SELECT));
    const { data, error } = await dataQuery.order("student_number").range(from, to);

    if (error) {
      console.error("getAcademicProgressOverview data query failed:", error);
      return {
        totalStudents: 0,
        byStatusLabel: emptyByStatusLabel(),
        requiringAction: 0,
        students: [],
        count: 0,
        page: safePage,
        capped: false,
        currentAcademicYear,
        error: "Could not load academic progress overview.",
      };
    }

    const rows = (data ?? []) as unknown as RawStudentRow[];
    const [statuses, supervisorNames] = await Promise.all([
      Promise.all(rows.map((r) => getStudentAcademicStatus(r.id))),
      getActiveSupervisorNamesByStudent(rows.map((r) => r.id)),
    ]);

    const students = rows.map((r, i) => normalizeRow(r, statuses[i], supervisorNames.get(r.id) ?? null));

    return {
      totalStudents: totalCount,
      byStatusLabel: emptyByStatusLabel(),
      requiringAction: 0,
      students,
      count: totalCount,
      page: safePage,
      capped: false,
      currentAcademicYear,
      error: null,
    };
  }

  // Slow path: Stage/Overall Status filter present.
  const candidatesQuery = applyCheapFilters(supabase.from("students").select(PROGRESS_STUDENT_SELECT));
  const { data: candidateData, error: candidateError } = await candidatesQuery.order("student_number").limit(STAGE_FILTER_FETCH_CAP);

  if (candidateError) {
    console.error("getAcademicProgressOverview candidate query failed:", candidateError);
    return {
      totalStudents: 0,
      byStatusLabel: emptyByStatusLabel(),
      requiringAction: 0,
      students: [],
      count: 0,
      page: filters.page,
      capped: false,
      currentAcademicYear,
      error: "Could not load academic progress overview.",
    };
  }

  const candidateRows = (candidateData ?? []) as unknown as RawStudentRow[];
  const capped = candidateRows.length === STAGE_FILTER_FETCH_CAP;

  const [candidateStatuses, supervisorNames] = await Promise.all([
    Promise.all(candidateRows.map((r) => getStudentAcademicStatus(r.id))),
    getActiveSupervisorNamesByStudent(candidateRows.map((r) => r.id)),
  ]);

  let normalized = candidateRows.map((r, i) => normalizeRow(r, candidateStatuses[i], supervisorNames.get(r.id) ?? null));

  if (filters.stage) normalized = normalized.filter((s) => s.currentStage === filters.stage);
  if (filters.statusLabel) normalized = normalized.filter((s) => s.statusLabel === filters.statusLabel);

  const totalCount = normalized.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ACADEMIC_PROGRESS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);
  const from = (safePage - 1) * ACADEMIC_PROGRESS_PAGE_SIZE;

  return {
    totalStudents: totalCount,
    byStatusLabel: emptyByStatusLabel(),
    requiringAction: 0,
    students: normalized.slice(from, from + ACADEMIC_PROGRESS_PAGE_SIZE),
    count: totalCount,
    page: safePage,
    capped,
    currentAcademicYear,
    error: null,
  };
}

/** Safety cap on the institution-wide tiles below — an institution beyond this active-student count needs genuine database-side aggregation, not this MVP tile computation; see the identical rationale on STAGE_FILTER_FETCH_CAP above. */
const TILES_FETCH_CAP = 1000;

/**
 * Institution-wide status tiles (the four summary numbers at the top of
 * the landing page) — deliberately NOT scoped to the current filters/
 * session/page, so they always read as "across every active student",
 * matching the existing tile semantics the page already had. Bounded to
 * active students only (never all statuses, never enrollment/results
 * history — getStudentAcademicStatus() only touches milestone_templates/
 * student_milestones/extension_applications, not the heavier
 * enrollments+results degree-audit path), same population the previous
 * unfiltered implementation covered, now with an explicit cap rather than
 * an unbounded fetch.
 */
export async function getAcademicProgressStatusTiles(): Promise<{
  totalStudents: number;
  byStatusLabel: Record<StudentStatusLabel, number>;
  requiringAction: number;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("students").select("id").eq("status", "active").limit(TILES_FETCH_CAP);

  if (error) {
    console.error("getAcademicProgressStatusTiles failed:", error);
    return { totalStudents: 0, byStatusLabel: emptyByStatusLabel(), requiringAction: 0 };
  }

  const ids = (data ?? []).map((r) => r.id);
  const statuses = await Promise.all(ids.map((id) => getStudentAcademicStatus(id)));

  const byStatusLabel = emptyByStatusLabel();
  let requiringAction = 0;
  for (const s of statuses) {
    if (!s) continue;
    byStatusLabel[s.statusLabel]++;
    if (s.requiresAdministrativeAction) requiringAction++;
  }

  return { totalStudents: ids.length, byStatusLabel, requiringAction };
}

export { UUID_RE };
