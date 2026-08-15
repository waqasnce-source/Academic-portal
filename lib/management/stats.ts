import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface ManagementOverviewStats {
  activeStudents: number;
  activeFaculty: number;
  activeDepartments: number;
  activePrograms: number;
  activeCourses: number;
  openCourseOfferings: number;
}

type CountableTable =
  | "students"
  | "faculty"
  | "departments"
  | "programs"
  | "courses"
  | "course_offerings";

async function countByStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: CountableTable,
  status: string
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("status", status);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Plain row counts filtered on each table's own existing `status` CHECK
 * values ('active' / 'open') — no derived or invented categories. Every
 * table read here has a management-readable RLS select policy already in
 * place (see supabase/migrations/20260813152648_remote_schema.sql).
 */
export async function getManagementOverviewStats(): Promise<ManagementOverviewStats> {
  const supabase = await createClient();

  const [
    activeStudents,
    activeFaculty,
    activeDepartments,
    activePrograms,
    activeCourses,
    openCourseOfferings,
  ] = await Promise.all([
    countByStatus(supabase, "students", "active"),
    countByStatus(supabase, "faculty", "active"),
    countByStatus(supabase, "departments", "active"),
    countByStatus(supabase, "programs", "active"),
    countByStatus(supabase, "courses", "active"),
    countByStatus(supabase, "course_offerings", "open"),
  ]);

  return {
    activeStudents,
    activeFaculty,
    activeDepartments,
    activePrograms,
    activeCourses,
    openCourseOfferings,
  };
}
