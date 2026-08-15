import "server-only";

import { createClient } from "@/lib/supabase/server";

export const MILESTONE_DEGREE_LEVELS = ["diploma", "bachelor", "master", "phd"] as const;
export type MilestoneDegreeLevelFilter = (typeof MILESTONE_DEGREE_LEVELS)[number];

export interface MilestoneTemplateRow {
  id: string;
  degree_level: MilestoneDegreeLevelFilter;
  applicable_entry_basis: "ms_mphil_llm" | "bs_master" | null;
  milestone_code: string;
  title: string;
  sequence_no: number;
  required: boolean;
  target_semester: number | null;
  target_days_after_admission: number | null;
  target_days_after_prerequisite: number | null;
  category: string | null;
  is_active: boolean;
  program: { id: string; name: string } | null;
}

export interface MilestoneTemplateFilters {
  degreeLevel: MilestoneDegreeLevelFilter | "";
  category: string;
}

const MILESTONE_TEMPLATE_SELECT = `
  id,
  degree_level,
  applicable_entry_basis,
  milestone_code,
  title,
  sequence_no,
  required,
  target_semester,
  target_days_after_admission,
  target_days_after_prerequisite,
  category,
  is_active,
  program:programs ( id, name )
`;

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parseMilestoneTemplateFilters(searchParams: RawSearchParams): MilestoneTemplateFilters {
  const rawDegreeLevel = firstValue(searchParams.degree_level).trim();
  const degreeLevel = (MILESTONE_DEGREE_LEVELS as readonly string[]).includes(rawDegreeLevel)
    ? (rawDegreeLevel as MilestoneDegreeLevelFilter)
    : "";
  const category = firstValue(searchParams.category).trim().slice(0, 100);
  return { degreeLevel, category };
}

export function hasActiveMilestoneTemplateFilters(filters: MilestoneTemplateFilters): boolean {
  return Boolean(filters.degreeLevel || filters.category);
}

export function buildMilestoneTemplatesHref(filters: MilestoneTemplateFilters): string {
  const params = new URLSearchParams();
  if (filters.degreeLevel) params.set("degree_level", filters.degreeLevel);
  if (filters.category) params.set("category", filters.category);
  const qs = params.toString();
  return qs ? `/management/milestones?${qs}` : "/management/milestones";
}

/**
 * No pagination — 39 seeded rows total across both degree levels, small
 * enough to show in one page; add pagination if the catalog grows
 * substantially.
 */
export async function getMilestoneTemplates(
  filters: MilestoneTemplateFilters
): Promise<{ data: MilestoneTemplateRow[]; error: string | null }> {
  const supabase = await createClient();

  let query = supabase.from("milestone_templates").select(MILESTONE_TEMPLATE_SELECT);
  if (filters.degreeLevel) query = query.eq("degree_level", filters.degreeLevel);
  if (filters.category) query = query.eq("category", filters.category);

  const { data, error } = await query
    .order("degree_level", { ascending: true })
    .order("sequence_no", { ascending: true });

  if (error) {
    console.error("getMilestoneTemplates failed:", error);
    return { data: [], error: "Could not load milestone templates." };
  }
  return { data: (data ?? []) as unknown as MilestoneTemplateRow[], error: null };
}
