import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Minimal management-wide search — four small, bounded ilike lookups
 * against tables management already has read access to (the same tables
 * every existing list page in this module already queries). No ranking,
 * no fuzzy matching, no new tables — per the explicit instruction to keep
 * this simple rather than building an enterprise search system.
 */

const RESULT_LIMIT = 8;

export interface SearchResultItem {
  label: string;
  sublabel: string;
  href: string;
}

export interface ManagementSearchResults {
  students: SearchResultItem[];
  faculty: SearchResultItem[];
  courses: SearchResultItem[];
  sessions: SearchResultItem[];
}

export async function runManagementSearch(rawQuery: string): Promise<ManagementSearchResults> {
  const q = rawQuery.trim();
  if (q.length < 2) {
    return { students: [], faculty: [], courses: [], sessions: [] };
  }

  const supabase = await createClient();
  const like = `%${q}%`;

  const [studentsRes, facultyRes, coursesRes, semestersRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, student_number, profile:profiles(full_name)")
      .or(`name.ilike.${like},student_number.ilike.${like}`)
      .limit(RESULT_LIMIT),
    supabase.from("faculty").select("id, name, designation").ilike("name", like).limit(RESULT_LIMIT),
    supabase.from("courses").select("id, code, name").or(`code.ilike.${like},name.ilike.${like}`).limit(RESULT_LIMIT),
    supabase.from("semesters").select("academic_year").ilike("academic_year", like).limit(50),
  ]);

  const students: SearchResultItem[] = (studentsRes.data ?? []).map((s) => ({
    label: (s.profile as unknown as { full_name: string } | null)?.full_name ?? s.name,
    sublabel: s.student_number,
    href: `/management/academic-progress/${s.id}`,
  }));

  const faculty: SearchResultItem[] = (facultyRes.data ?? []).map((f) => ({
    label: f.name,
    sublabel: f.designation ?? "Faculty",
    href: `/management/reports/teaching-load/${f.id}`,
  }));

  const courses: SearchResultItem[] = (coursesRes.data ?? []).map((c) => ({
    label: c.code,
    sublabel: c.name,
    href: `/management/courses`,
  }));

  const distinctYears = [...new Set((semestersRes.data ?? []).map((s) => s.academic_year))].sort().reverse();
  const sessions: SearchResultItem[] = distinctYears.slice(0, RESULT_LIMIT).map((year) => ({
    label: year,
    sublabel: "Academic Session",
    href: `/management/academic-sessions/${encodeURIComponent(year)}`,
  }));

  return { students, faculty, courses, sessions };
}
