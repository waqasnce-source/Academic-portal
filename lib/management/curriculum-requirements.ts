import "server-only";

import { createClient } from "@/lib/supabase/server";
import { type RawSearchParams, firstValue, parsePage, parseUuid } from "@/lib/management/query-params";
import {
  PHD_ENTRY_BASIS_VALUES,
  type PhdEntryBasisValue,
  REQUIREMENT_CATEGORIES,
  type RequirementCategory,
} from "./status-enums";

export { PHD_ENTRY_BASIS_VALUES, type PhdEntryBasisValue, REQUIREMENT_CATEGORIES, type RequirementCategory };

export const CURRICULUM_REQUIREMENTS_PAGE_SIZE = 25;

export interface CurriculumRequirementRow {
  id: string;
  requirement_category: RequirementCategory;
  required_credit_hours: number | null;
  recommended_semester: number | null;
  is_mandatory: boolean;
  applicable_entry_basis: PhdEntryBasisValue | null;
  created_at: string;
  program: { id: string; code: string; name: string };
  specialization: { id: string; name: string } | null;
  course: { id: string; code: string; name: string; credit_hours: number } | null;
}

export interface CurriculumRequirementFilters {
  programId: string;
  specializationId: string;
  category: RequirementCategory | "";
  page: number;
}

export interface CurriculumRequirementsResult {
  data: CurriculumRequirementRow[];
  count: number;
  page: number;
  error: string | null;
}

export interface CurriculumRequirementFilterOptions {
  programs: { id: string; code: string; name: string }[];
  specializations: { id: string; name: string; department: { id: string; name: string } }[];
}

export function parseCurriculumRequirementFilters(
  searchParams: RawSearchParams
): CurriculumRequirementFilters {
  const rawCategory = firstValue(searchParams.category).trim();
  const category = (REQUIREMENT_CATEGORIES as readonly string[]).includes(rawCategory)
    ? (rawCategory as RequirementCategory)
    : "";

  return {
    programId: parseUuid(searchParams.program),
    specializationId: parseUuid(searchParams.specialization),
    category,
    page: parsePage(searchParams.page),
  };
}

export function hasActiveCurriculumRequirementFilters(filters: CurriculumRequirementFilters): boolean {
  return Boolean(filters.programId || filters.specializationId || filters.category);
}

export function buildCurriculumRequirementsHref(filters: CurriculumRequirementFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.programId) params.set("program", filters.programId);
  if (filters.specializationId) params.set("specialization", filters.specializationId);
  if (filters.category) params.set("category", filters.category);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/curriculum-requirements?${qs}` : "/management/curriculum-requirements";
}

/**
 * program:programs!inner is safe (program_id is NOT NULL). specialization
 * and course are plain (nullable by design — see the migration comment on
 * curriculum_requirements_course_or_category_ch).
 */
const CURRICULUM_REQUIREMENT_SELECT = `
  id,
  requirement_category,
  required_credit_hours,
  recommended_semester,
  is_mandatory,
  applicable_entry_basis,
  created_at,
  program:programs!inner ( id, code, name ),
  specialization:specializations ( id, name ),
  course:courses ( id, code, name, credit_hours )
`;

export async function getCurriculumRequirements(
  filters: CurriculumRequirementFilters
): Promise<CurriculumRequirementsResult> {
  const supabase = await createClient();

  let countQuery = supabase.from("curriculum_requirements").select("id", { count: "exact", head: true });
  if (filters.programId) countQuery = countQuery.eq("program_id", filters.programId);
  if (filters.specializationId) countQuery = countQuery.eq("specialization_id", filters.specializationId);
  if (filters.category) countQuery = countQuery.eq("requirement_category", filters.category);

  const { count, error: countError } = await countQuery;
  if (countError) {
    console.error("getCurriculumRequirements count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load curriculum requirements." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / CURRICULUM_REQUIREMENTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("curriculum_requirements").select(CURRICULUM_REQUIREMENT_SELECT);
  if (filters.programId) dataQuery = dataQuery.eq("program_id", filters.programId);
  if (filters.specializationId) dataQuery = dataQuery.eq("specialization_id", filters.specializationId);
  if (filters.category) dataQuery = dataQuery.eq("requirement_category", filters.category);

  const from = (safePage - 1) * CURRICULUM_REQUIREMENTS_PAGE_SIZE;
  const to = from + CURRICULUM_REQUIREMENTS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery.order("created_at", { ascending: false }).range(from, to);
  if (error) {
    console.error("getCurriculumRequirements data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load curriculum requirements." };
  }

  return {
    data: (data ?? []) as unknown as CurriculumRequirementRow[],
    count: totalCount,
    page: safePage,
    error: null,
  };
}

export async function getCurriculumRequirementFilterOptions(): Promise<CurriculumRequirementFilterOptions> {
  const supabase = await createClient();

  const [{ data: programs, error: programsError }, { data: specializations, error: specializationsError }] =
    await Promise.all([
      supabase.from("programs").select("id, code, name").eq("status", "active").order("name"),
      supabase
        .from("specializations")
        .select("id, name, department:departments!inner ( id, name )")
        .eq("is_active", true)
        .order("name"),
    ]);

  if (programsError) console.error("getCurriculumRequirementFilterOptions programs failed:", programsError);
  if (specializationsError) {
    console.error("getCurriculumRequirementFilterOptions specializations failed:", specializationsError);
  }

  return {
    programs: programs ?? [],
    specializations: (specializations ?? []) as unknown as CurriculumRequirementFilterOptions["specializations"],
  };
}

export { getCourseOptions, type CourseOption } from "./courses";

export interface CurriculumRequirementDetail {
  id: string;
  program_id: string;
  specialization_id: string | null;
  course_id: string | null;
  requirement_category: RequirementCategory;
  required_credit_hours: number | null;
  recommended_semester: number | null;
  is_mandatory: boolean;
  applicable_entry_basis: PhdEntryBasisValue | null;
}

export async function getCurriculumRequirementById(id: string): Promise<CurriculumRequirementDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("curriculum_requirements")
    .select(
      "id, program_id, specialization_id, course_id, requirement_category, required_credit_hours, recommended_semester, is_mandatory, applicable_entry_basis"
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as CurriculumRequirementDetail;
}

export interface CurriculumRequirementInput {
  program_id: string;
  specialization_id: string | null;
  course_id: string | null;
  requirement_category: RequirementCategory;
  required_credit_hours: number | null;
  recommended_semester: number | null;
  is_mandatory: boolean;
  applicable_entry_basis: PhdEntryBasisValue | null;
}

/**
 * Raw mutation helpers — return the Supabase response as-is so the
 * calling Server Action can map `error` through toUserMessage(). RLS
 * enforcement is curriculum_requirements_insert_management /
 * _update_management (has_role('management')). The database-level
 * curriculum_requirements_course_or_category_ch check is the actual
 * course-vs-category guard; the Server Action layer should still validate
 * up front for a clean user-facing message rather than a raw 23514.
 */
export async function createCurriculumRequirement(input: CurriculumRequirementInput) {
  const supabase = await createClient();
  return supabase.from("curriculum_requirements").insert(input).select("id").single();
}

export async function updateCurriculumRequirement(id: string, input: CurriculumRequirementInput) {
  const supabase = await createClient();
  return supabase.from("curriculum_requirements").update(input).eq("id", id).select("id").single();
}

export async function deleteCurriculumRequirement(id: string) {
  const supabase = await createClient();
  return supabase.from("curriculum_requirements").delete().eq("id", id);
}
