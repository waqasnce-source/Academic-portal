import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  type RawSearchParams,
  parseUuid,
  parsePage,
  parseText,
} from "@/lib/management/query-params";
import { courseCreditHours, isReportableOffering } from "@/lib/management/reporting-policy";

export const TEACHING_LOAD_PAGE_SIZE = 25;

/**
 * Safety cap on the raw fetch this report aggregates in memory (see
 * module doc below for why). An institution with more than this many
 * total course-offering/faculty assignments would need a genuine
 * server-side aggregation feature, not an MVP report.
 */
const RAW_FETCH_LIMIT = 2000;

export interface TeachingLoadRow {
  facultyId: string;
  fullName: string;
  offeringCount: number;
  totalCreditHours: number;
}

export interface TeachingLoadFilters {
  q: string;
  semesterId: string;
  departmentId: string;
  page: number;
}

export interface TeachingLoadResult {
  data: TeachingLoadRow[];
  count: number;
  page: number;
  error: string | null;
}

export interface TeachingLoadFilterOptions {
  semesters: { id: string; name: string; academic_year: string }[];
  departments: { id: string; name: string }[];
}

export function parseTeachingLoadFilters(searchParams: RawSearchParams): TeachingLoadFilters {
  return {
    q: parseText(searchParams.q),
    semesterId: parseUuid(searchParams.semester),
    departmentId: parseUuid(searchParams.department),
    page: parsePage(searchParams.page),
  };
}

export function hasActiveTeachingLoadFilters(filters: TeachingLoadFilters): boolean {
  return Boolean(filters.q || filters.semesterId || filters.departmentId);
}

export function buildTeachingLoadHref(filters: TeachingLoadFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.semesterId) params.set("semester", filters.semesterId);
  if (filters.departmentId) params.set("department", filters.departmentId);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/reports/teaching-load?${qs}` : "/management/reports/teaching-load";
}

interface RawAssignmentRow {
  /** profile nullable as of Phase 3 (faculty.profile_id relaxation) — see the Phase 8B fix note below; `name` is the fallback display identity. */
  faculty: { id: string; name: string; profile: { full_name: string } | null };
  course_offering: {
    status: string;
    course: { credit_hours: number; department_id: string };
    semester_id: string;
  };
}

/**
 * Report row from the schema analysis: "Faculty Teaching Load — tables:
 * course_offering_faculty, course_offerings, courses, semesters, faculty
 * — filters: semester, department, faculty — metrics: offerings taught,
 * sum of courses.credit_hours per faculty."
 *
 * PostgREST aggregate functions are disabled on this project (confirmed
 * live — PGRST123), so there's no server-side SUM/GROUP BY available.
 * `department` and `faculty` (name search) filters both require paths two
 * embed-levels deep (`course_offering.course.department_id`,
 * `faculty.profile.full_name`) — only one-level dot-path embedded filters
 * have been verified to work against this project (e.g.
 * `program.department_id` in students.ts), so rather than assume a
 * deeper, unverified filter depth also works, this fetches a bounded set
 * of assignment rows (RAW_FETCH_LIMIT) through the normal RLS-respecting
 * client and does the semester filter server-side (one level:
 * `course_offering.semester_id`) but department/name filtering and all
 * grouping/summing in application code.
 *
 * `course_offering_faculty_self_select` (`faculty_id = get_my_faculty_id()
 * OR management`) and `courses_select_authenticated` (`true`) both permit
 * a management caller to read everything needed.
 *
 * Applies the shared reporting policy from ../reporting-policy.ts:
 * isReportableOffering() excludes 'planned'/'cancelled' offerings (this
 * previously included them, silently diverging from academic-sessions.ts,
 * which already excluded 'cancelled' — now both surfaces agree), and
 * courseCreditHours() is the same CH coercion used everywhere else, so
 * this report's totals can never again drift from academic-sessions.ts's.
 *
 * `profile:profiles` is a PLAIN embed (Phase 8B fix): faculty.profile_id
 * is nullable (Phase 3), so `profile:profiles!inner` previously dropped
 * every assignment row for a profile-less faculty member from this report
 * entirely — the same hazard as enrollments.ts/attendance.ts/results.ts,
 * fixed the same way. `name` (faculty.name, NOT NULL) is the fallback
 * identity, applied below wherever `.profile.full_name` was read directly.
 */
export async function getTeachingLoadReport(
  filters: TeachingLoadFilters
): Promise<TeachingLoadResult> {
  const supabase = await createClient();

  let query = supabase
    .from("course_offering_faculty")
    .select(
      `faculty:faculty!inner ( id, name, profile:profiles ( full_name ) ),
       course_offering:course_offerings!inner ( status, semester_id, course:courses!inner ( credit_hours, department_id ) )`
    )
    .limit(RAW_FETCH_LIMIT);

  if (filters.semesterId) query = query.eq("course_offering.semester_id", filters.semesterId);

  const { data, error } = await query;

  if (error) {
    console.error("getTeachingLoadReport query failed:", error);
    return { data: [], count: 0, page: filters.page, error: "Could not load the teaching load report." };
  }

  const rows = (data ?? []) as unknown as RawAssignmentRow[];
  const q = filters.q.trim().toLowerCase();

  const filtered = rows.filter((row) => {
    if (!isReportableOffering(row.course_offering.status)) {
      return false;
    }
    if (filters.departmentId && row.course_offering.course.department_id !== filters.departmentId) {
      return false;
    }
    const facultyName = row.faculty.profile?.full_name ?? row.faculty.name;
    if (q && !facultyName.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  const byFaculty = new Map<string, TeachingLoadRow>();
  for (const row of filtered) {
    const rowCreditHours = courseCreditHours(row.course_offering.course);
    const existing = byFaculty.get(row.faculty.id);
    if (existing) {
      existing.offeringCount += 1;
      existing.totalCreditHours += rowCreditHours;
    } else {
      byFaculty.set(row.faculty.id, {
        facultyId: row.faculty.id,
        fullName: row.faculty.profile?.full_name ?? row.faculty.name,
        offeringCount: 1,
        totalCreditHours: rowCreditHours,
      });
    }
  }

  const grouped = Array.from(byFaculty.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));

  const totalCount = grouped.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / TEACHING_LOAD_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);
  const from = (safePage - 1) * TEACHING_LOAD_PAGE_SIZE;

  return {
    data: grouped.slice(from, from + TEACHING_LOAD_PAGE_SIZE),
    count: totalCount,
    page: safePage,
    error: null,
  };
}

export async function getTeachingLoadFilterOptions(): Promise<TeachingLoadFilterOptions> {
  const supabase = await createClient();

  const [semestersRes, departmentsRes] = await Promise.all([
    supabase.from("semesters").select("id, name, academic_year").order("start_date", { ascending: false }),
    supabase.from("departments").select("id, name").eq("status", "active").order("name"),
  ]);

  if (semestersRes.error) console.error("getTeachingLoadFilterOptions semesters failed:", semestersRes.error);
  if (departmentsRes.error) console.error("getTeachingLoadFilterOptions departments failed:", departmentsRes.error);

  return {
    semesters: semestersRes.data ?? [],
    departments: departmentsRes.data ?? [],
  };
}
