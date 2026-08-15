import "server-only";

import { createClient } from "@/lib/supabase/server";
import { EXTENSION_APPLICATION_STATUSES, type ExtensionApplicationStatus } from "./status-enums";

export { EXTENSION_APPLICATION_STATUSES, type ExtensionApplicationStatus };

export const EXTENSIONS_PAGE_SIZE = 25;

export interface ExtensionApplicationRow {
  id: string;
  application_date: string;
  requested_extension_semesters: number | null;
  requested_from: string | null;
  requested_to: string | null;
  status: ExtensionApplicationStatus;
  approval_date: string | null;
  student: {
    student_number: string;
    profile: { full_name: string } | null;
  };
}

export interface ExtensionFilters {
  status: ExtensionApplicationStatus | "";
  page: number;
}

const EXTENSION_SELECT = `
  id,
  application_date,
  requested_extension_semesters,
  requested_from,
  requested_to,
  status,
  approval_date,
  student:students!inner ( student_number, profile:profiles ( full_name ) )
`;

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parseExtensionFilters(searchParams: RawSearchParams): ExtensionFilters {
  const rawStatus = firstValue(searchParams.status).trim();
  const status = (EXTENSION_APPLICATION_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as ExtensionApplicationStatus)
    : "";
  const rawPage = Number.parseInt(firstValue(searchParams.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  return { status, page };
}

export function hasActiveExtensionFilters(filters: ExtensionFilters): boolean {
  return Boolean(filters.status);
}

export function buildExtensionsHref(filters: ExtensionFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/management/extensions?${qs}` : "/management/extensions";
}

export async function getExtensionApplications(
  filters: ExtensionFilters
): Promise<{ data: ExtensionApplicationRow[]; count: number; page: number; error: string | null }> {
  const supabase = await createClient();

  let countQuery = supabase.from("extension_applications").select("id", { count: "exact", head: true });
  if (filters.status) countQuery = countQuery.eq("status", filters.status);

  const { count, error: countError } = await countQuery;
  if (countError) {
    console.error("getExtensionApplications count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load extension applications." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / EXTENSIONS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("extension_applications").select(EXTENSION_SELECT);
  if (filters.status) dataQuery = dataQuery.eq("status", filters.status);

  const from = (safePage - 1) * EXTENSIONS_PAGE_SIZE;
  const to = from + EXTENSIONS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery.order("application_date", { ascending: false }).range(from, to);

  if (error) {
    console.error("getExtensionApplications data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load extension applications." };
  }

  return {
    data: (data ?? []) as unknown as ExtensionApplicationRow[],
    count: totalCount,
    page: safePage,
    error: null,
  };
}

export interface ExtensionApplicationDetail {
  id: string;
  student_id: string;
  application_date: string;
  current_semester: number | null;
  requested_extension_semesters: number | null;
  requested_from: string | null;
  requested_to: string | null;
  reason: string | null;
  status: ExtensionApplicationStatus;
  recommendation: string | null;
  approval_date: string | null;
  remarks: string | null;
  student: { student_number: string; profile: { full_name: string } | null };
}

const EXTENSION_DETAIL_SELECT = `
  id,
  student_id,
  application_date,
  current_semester,
  requested_extension_semesters,
  requested_from,
  requested_to,
  reason,
  status,
  recommendation,
  approval_date,
  remarks,
  student:students!inner ( student_number, profile:profiles ( full_name ) )
`;

export async function getExtensionApplicationById(id: string): Promise<ExtensionApplicationDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("extension_applications")
    .select(EXTENSION_DETAIL_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as ExtensionApplicationDetail;
}

export interface ExtensionApplicationInput {
  student_id: string;
  application_date: string;
  current_semester: number | null;
  requested_extension_semesters: number | null;
  requested_from: string | null;
  requested_to: string | null;
  reason: string | null;
}

/**
 * Recorded by Management — no student-facing submission UI exists for
 * extensions (the original spec's Student capability list never included
 * self-service extension applications, unlike document upload, which it
 * explicitly did). Created in 'draft' status; a separate review step
 * moves it to submitted/under_review/approved/rejected.
 */
export async function createExtensionApplication(input: ExtensionApplicationInput) {
  const supabase = await createClient();
  return supabase
    .from("extension_applications")
    .insert({ ...input, status: "draft" })
    .select("id")
    .single();
}

export interface ExtensionReviewInput {
  status: ExtensionApplicationStatus;
  recommendation: string | null;
  remarks: string | null;
}

/**
 * Moves an application through submitted -> under_review -> approved/
 * rejected. approval_date is stamped automatically the moment status
 * becomes 'approved' or 'rejected' (a final decision), left untouched for
 * intermediate transitions (draft/submitted/under_review).
 */
export async function reviewExtensionApplication(id: string, input: ExtensionReviewInput) {
  const supabase = await createClient();
  const isFinal = input.status === "approved" || input.status === "rejected";
  return supabase
    .from("extension_applications")
    .update({
      status: input.status,
      recommendation: input.recommendation,
      remarks: input.remarks,
      ...(isFinal ? { approval_date: new Date().toISOString().slice(0, 10) } : {}),
    })
    .eq("id", id);
}

export interface StudentOption {
  id: string;
  student_number: string;
  full_name: string;
}

/**
 * Plain select (no profiles join) — students.name is the authoritative
 * display name regardless of whether an account is linked (Phase 6). This
 * is shared by the Extension and Thesis "create" forms.
 */
export async function getActiveStudentOptions(): Promise<StudentOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, student_number, name")
    .eq("status", "active")
    .order("student_number");

  if (error) {
    console.error("getActiveStudentOptions failed:", error);
    return [];
  }
  return ((data ?? []) as unknown as { id: string; student_number: string; name: string }[]).map((s) => ({
    id: s.id,
    student_number: s.student_number,
    full_name: s.name,
  }));
}
