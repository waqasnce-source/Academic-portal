import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  type RawSearchParams,
  parseUuid,
  parsePage,
  parseText,
  escapeIlike,
} from "@/lib/management/query-params";

export const CAPACITY_REPORT_PAGE_SIZE = 25;

/**
 * Which enrollment status counts as "enrolled" for the utilization
 * figure. Mirrors enrollments.status's CHECK constraint exactly — same
 * const shape as lib/management/enrollments.ts, kept independent since
 * this file has no dependency on that module.
 */
export const COUNTED_ENROLLMENT_STATUSES = ["active", "completed", "dropped", "failed"] as const;
export type CountedEnrollmentStatus = (typeof COUNTED_ENROLLMENT_STATUSES)[number];

export interface CapacityRow {
  id: string;
  section: string;
  capacity: number | null;
  course: { code: string; name: string };
  semester: { name: string; academic_year: string };
  /** Count of enrollments on this offering matching the selected status filter. */
  enrolledCount: number;
  /** enrolledCount / capacity as a 0-100 percentage, or null if capacity isn't set. */
  utilizationPercent: number | null;
}

export interface CapacityFilters {
  q: string;
  semesterId: string;
  /** Defaults to 'active' when absent/invalid — the metric the report row documents ("active-enrollment count vs capacity"). */
  status: CountedEnrollmentStatus;
  page: number;
}

export interface CapacityReportResult {
  data: CapacityRow[];
  count: number;
  page: number;
  error: string | null;
}

export interface CapacityFilterOptions {
  semesters: { id: string; name: string; academic_year: string }[];
}

export function parseCapacityFilters(searchParams: RawSearchParams): CapacityFilters {
  const rawStatus = parseText(searchParams.status, 20);
  const status = (COUNTED_ENROLLMENT_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as CountedEnrollmentStatus)
    : "active";

  return {
    q: parseText(searchParams.q),
    semesterId: parseUuid(searchParams.semester),
    status,
    page: parsePage(searchParams.page),
  };
}

export function hasActiveCapacityFilters(filters: CapacityFilters): boolean {
  return Boolean(filters.q || filters.semesterId);
}

export function buildCapacityHref(filters: CapacityFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.semesterId) params.set("semester", filters.semesterId);
  if (filters.status !== "active") params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/reports/enrollment-capacity?${qs}` : "/management/reports/enrollment-capacity";
}

/**
 * Report row from the schema analysis: "Enrollment Headcount & Capacity
 * Utilization — tables: enrollments, course_offerings, courses,
 * semesters — filters: semester, course, enrollment status — metrics:
 * active-enrollment count vs capacity."
 *
 * PostgREST aggregate functions (`sum()`/`count()` with an implicit
 * GROUP BY) are disabled on this project (confirmed live: querying with
 * an aggregate function returns PGRST123 "Use of aggregate functions is
 * not allowed"). So this paginates `course_offerings` first (same
 * count-first-then-clamp pattern as every other module), then for just
 * that page's offering ids, fetches the matching `enrollments` rows
 * (`course_offering_id`, `status` only) with a plain `.in()` filter and
 * groups them by offering in JavaScript — one extra query per page, not
 * per row, so this isn't N+1.
 *
 * `course_offerings_select_authenticated` (`true`) and
 * `enrollments_select_authenticated` (`has_role('management') OR ...`)
 * both permit a management caller to read everything needed.
 */
export async function getCapacityReport(
  filters: CapacityFilters
): Promise<CapacityReportResult> {
  const supabase = await createClient();

  let countQuery = supabase
    .from("course_offerings")
    .select("id, course:courses!inner(id)", { count: "exact", head: true });

  if (filters.semesterId) countQuery = countQuery.eq("semester_id", filters.semesterId);
  if (filters.q) {
    countQuery = countQuery.or(
      `code.ilike.%${escapeIlike(filters.q)}%,name.ilike.%${escapeIlike(filters.q)}%`,
      { referencedTable: "course" }
    );
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getCapacityReport count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load the capacity report." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / CAPACITY_REPORT_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let offeringsQuery = supabase.from("course_offerings").select(`
    id, section, capacity,
    course:courses!inner ( code, name ),
    semester:semesters!inner ( name, academic_year )
  `);

  if (filters.semesterId) offeringsQuery = offeringsQuery.eq("semester_id", filters.semesterId);
  if (filters.q) {
    offeringsQuery = offeringsQuery.or(
      `code.ilike.%${escapeIlike(filters.q)}%,name.ilike.%${escapeIlike(filters.q)}%`,
      { referencedTable: "course" }
    );
  }

  const from = (safePage - 1) * CAPACITY_REPORT_PAGE_SIZE;
  const to = from + CAPACITY_REPORT_PAGE_SIZE - 1;

  const { data: offerings, error: offeringsError } = await offeringsQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (offeringsError) {
    console.error("getCapacityReport offerings query failed:", offeringsError);
    return { data: [], count: 0, page: safePage, error: "Could not load the capacity report." };
  }

  const rows = (offerings ?? []) as unknown as Array<{
    id: string;
    section: string;
    capacity: number | null;
    course: { code: string; name: string };
    semester: { name: string; academic_year: string };
  }>;

  if (rows.length === 0) {
    return { data: [], count: totalCount, page: safePage, error: null };
  }

  const offeringIds = rows.map((r) => r.id);
  const { data: enrollmentRows, error: enrollmentsError } = await supabase
    .from("enrollments")
    .select("course_offering_id, status")
    .in("course_offering_id", offeringIds);

  if (enrollmentsError) {
    console.error("getCapacityReport enrollments query failed:", enrollmentsError);
    return { data: [], count: 0, page: safePage, error: "Could not load the capacity report." };
  }

  const countsByOffering = new Map<string, number>();
  for (const row of (enrollmentRows ?? []) as { course_offering_id: string; status: string }[]) {
    if (row.status !== filters.status) continue;
    countsByOffering.set(row.course_offering_id, (countsByOffering.get(row.course_offering_id) ?? 0) + 1);
  }

  const data: CapacityRow[] = rows.map((r) => {
    const enrolledCount = countsByOffering.get(r.id) ?? 0;
    return {
      id: r.id,
      section: r.section,
      capacity: r.capacity,
      course: r.course,
      semester: r.semester,
      enrolledCount,
      utilizationPercent: r.capacity ? Math.round((enrolledCount / r.capacity) * 1000) / 10 : null,
    };
  });

  return { data, count: totalCount, page: safePage, error: null };
}

export async function getCapacityFilterOptions(): Promise<CapacityFilterOptions> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("semesters")
    .select("id, name, academic_year")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("getCapacityFilterOptions semesters failed:", error);
  }

  return { semesters: data ?? [] };
}
