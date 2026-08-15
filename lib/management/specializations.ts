import "server-only";

import { createClient } from "@/lib/supabase/server";

export const SPECIALIZATIONS_PAGE_SIZE = 25;

export interface SpecializationRow {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  department: {
    id: string;
    code: string;
    name: string;
  };
  /** Count of students with this specialization_id. */
  studentCount: number;
}

interface RawSpecializationRow {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  department: { id: string; code: string; name: string };
  students: { count: number }[] | null;
}

export interface SpecializationFilters {
  q: string;
  departmentId: string;
  isActive: "" | "true" | "false";
  page: number;
}

export interface SpecializationsResult {
  data: SpecializationRow[];
  count: number;
  page: number;
  error: string | null;
}

export interface SpecializationFilterOptions {
  departments: { id: string; name: string }[];
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parseSpecializationFilters(searchParams: RawSearchParams): SpecializationFilters {
  const q = firstValue(searchParams.q).trim().slice(0, 200);

  const rawDepartment = firstValue(searchParams.department).trim();
  const departmentId = UUID_RE.test(rawDepartment) ? rawDepartment : "";

  const rawIsActive = firstValue(searchParams.is_active).trim();
  const isActive = rawIsActive === "true" || rawIsActive === "false" ? rawIsActive : "";

  const rawPage = Number.parseInt(firstValue(searchParams.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return { q, departmentId, isActive, page };
}

export function hasActiveSpecializationFilters(filters: SpecializationFilters): boolean {
  return Boolean(filters.q || filters.departmentId || filters.isActive);
}

export function buildSpecializationsHref(filters: SpecializationFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.departmentId) params.set("department", filters.departmentId);
  if (filters.isActive) params.set("is_active", filters.isActive);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/specializations?${qs}` : "/management/specializations";
}

const SPECIALIZATION_SELECT = `
  id,
  code,
  name,
  description,
  is_active,
  created_at,
  department:departments!inner ( id, code, name ),
  students(count)
`;

function normalize(row: RawSpecializationRow): SpecializationRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    is_active: row.is_active,
    created_at: row.created_at,
    department: row.department,
    studentCount: row.students?.[0]?.count ?? 0,
  };
}

export async function getSpecializations(filters: SpecializationFilters): Promise<SpecializationsResult> {
  const supabase = await createClient();

  let countQuery = supabase.from("specializations").select("id", { count: "exact", head: true });

  if (filters.departmentId) countQuery = countQuery.eq("department_id", filters.departmentId);
  if (filters.isActive) countQuery = countQuery.eq("is_active", filters.isActive === "true");
  if (filters.q) {
    const escaped = filters.q.replace(/[(),]/g, "");
    countQuery = countQuery.or(`name.ilike.%${escaped}%,code.ilike.%${escaped}%`);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getSpecializations count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load specialization records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / SPECIALIZATIONS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("specializations").select(SPECIALIZATION_SELECT);

  if (filters.departmentId) dataQuery = dataQuery.eq("department_id", filters.departmentId);
  if (filters.isActive) dataQuery = dataQuery.eq("is_active", filters.isActive === "true");
  if (filters.q) {
    const escaped = filters.q.replace(/[(),]/g, "");
    dataQuery = dataQuery.or(`name.ilike.%${escaped}%,code.ilike.%${escaped}%`);
  }

  const from = (safePage - 1) * SPECIALIZATIONS_PAGE_SIZE;
  const to = from + SPECIALIZATIONS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery.order("name", { ascending: true }).range(from, to);

  if (error) {
    console.error("getSpecializations data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load specialization records." };
  }

  return {
    data: ((data ?? []) as unknown as RawSpecializationRow[]).map(normalize),
    count: totalCount,
    page: safePage,
    error: null,
  };
}

export async function getSpecializationFilterOptions(): Promise<SpecializationFilterOptions> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("departments").select("id, name").eq("status", "active").order("name");

  if (error) {
    console.error("getSpecializationFilterOptions departments failed:", error);
  }

  return { departments: data ?? [] };
}

export interface SpecializationDetail {
  id: string;
  department_id: string;
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface SpecializationInput {
  department_id: string;
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
}

export async function getSpecializationById(id: string): Promise<SpecializationDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specializations")
    .select("id, department_id, code, name, description, is_active")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as SpecializationDetail;
}

export async function createSpecialization(input: SpecializationInput) {
  const supabase = await createClient();
  return supabase.from("specializations").insert(input).select("id").single();
}

export async function updateSpecialization(id: string, input: SpecializationInput) {
  const supabase = await createClient();
  return supabase.from("specializations").update(input).eq("id", id).select("id").single();
}

export async function setSpecializationActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  return supabase.from("specializations").update({ is_active: isActive }).eq("id", id);
}
