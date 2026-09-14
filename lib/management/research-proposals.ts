import "server-only";

import { createClient } from "@/lib/supabase/server";
import { type RawSearchParams, parsePage, parseText, escapeIlike } from "@/lib/management/query-params";
import { sortByDesignationRank } from "@/lib/management/faculty-rank";
import type { ResearchProposalRow } from "@/lib/academic/research";

export { getResearchProposalsForProject, getLatestResearchProposal } from "@/lib/academic/research";
export type { ResearchProposalRow, ProposalStageStatus } from "@/lib/academic/research";

export const RESEARCH_PROJECTS_PAGE_SIZE = 25;

export interface ResearchProjectListRow {
  id: string;
  title: string;
  research_area: string | null;
  status: string | null;
  created_at: string;
  student: { id: string; student_number: string; name: string };
  supervisor: { id: string; name: string } | null;
}

export interface ResearchProjectFilters {
  q: string;
  page: number;
}

export function parseResearchProjectFilters(searchParams: RawSearchParams): ResearchProjectFilters {
  return { q: parseText(searchParams.q), page: parsePage(searchParams.page) };
}

export function hasActiveResearchProjectFilters(filters: ResearchProjectFilters): boolean {
  return Boolean(filters.q);
}

export function buildResearchProjectsHref(filters: ResearchProjectFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/management/research-proposals?${qs}` : "/management/research-proposals";
}

/**
 * student:students!inner is safe (student_id is NOT NULL / on delete
 * restrict); supervisor:faculty is a plain embed since supervisor_id is
 * nullable (a project can be recorded before a supervisor is declared).
 */
const RESEARCH_PROJECT_LIST_SELECT = `
  id,
  title,
  research_area,
  status,
  created_at,
  student:students!inner ( id, student_number, name ),
  supervisor:faculty ( id, name )
`;

export async function getResearchProjects(
  filters: ResearchProjectFilters
): Promise<{ data: ResearchProjectListRow[]; count: number; page: number; error: string | null }> {
  const supabase = await createClient();

  let countQuery = supabase.from("research_projects").select("id", { count: "exact", head: true });
  if (filters.q) {
    const escaped = escapeIlike(filters.q);
    countQuery = countQuery.ilike("title", `%${escaped}%`);
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    console.error("getResearchProjects count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load research projects." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / RESEARCH_PROJECTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("research_projects").select(RESEARCH_PROJECT_LIST_SELECT);
  if (filters.q) {
    const escaped = escapeIlike(filters.q);
    dataQuery = dataQuery.ilike("title", `%${escaped}%`);
  }

  const from = (safePage - 1) * RESEARCH_PROJECTS_PAGE_SIZE;
  const to = from + RESEARCH_PROJECTS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery.order("created_at", { ascending: false }).range(from, to);
  if (error) {
    console.error("getResearchProjects data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load research projects." };
  }

  return {
    data: (data ?? []) as unknown as ResearchProjectListRow[],
    count: totalCount,
    page: safePage,
    error: null,
  };
}

export interface ResearchProjectDetail {
  id: string;
  title: string;
  abstract: string | null;
  research_area: string | null;
  status: string | null;
  student: { id: string; student_number: string; name: string; program: { degree_level: string } | null };
  supervisor: { id: string; name: string } | null;
}

const RESEARCH_PROJECT_DETAIL_SELECT = `
  id,
  title,
  abstract,
  research_area,
  status,
  student:students!inner ( id, student_number, name, program:programs ( degree_level ) ),
  supervisor:faculty ( id, name )
`;

export async function getResearchProjectDetail(id: string): Promise<ResearchProjectDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_projects")
    .select(RESEARCH_PROJECT_DETAIL_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as ResearchProjectDetail;
}

/**
 * profiles has no single embed relationship usable for both
 * gsc_reviewed_by and asrb_reviewed_by on the same query without a
 * disambiguating hint, so reviewer names are resolved with one small
 * batched lookup instead of an embed.
 */
export async function getReviewerNames(proposals: ResearchProposalRow[]): Promise<Map<string, string>> {
  const ids = Array.from(
    new Set(
      proposals.flatMap((p) => [p.gsc_reviewed_by, p.asrb_reviewed_by]).filter((id): id is string => id !== null)
    )
  );
  if (ids.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  if (error) {
    console.error("getReviewerNames failed:", error);
    return new Map();
  }
  return new Map((data ?? []).map((p) => [p.id as string, p.full_name as string]));
}

export interface SupervisorOption {
  id: string;
  name: string;
}

export async function getFacultyOptions(): Promise<SupervisorOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faculty")
    .select("id, name, designation")
    .eq("status", "active")
    .order("name");
  if (error) {
    console.error("getFacultyOptions failed:", error);
    return [];
  }
  const rows = (data ?? []) as { id: string; name: string; designation: string }[];
  return sortByDesignationRank(rows, (r) => r.designation, (r) => r.name).map((r) => ({ id: r.id, name: r.name }));
}
