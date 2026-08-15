import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getStudentAcademicStatus, STUDENT_STATUS_LABELS, type StudentStatusLabel } from "@/lib/academic/status-engine";

export interface StudentProgressSummaryRow {
  id: string;
  student_number: string;
  full_name: string;
  program_name: string;
  degree_level: string;
  statusLabel: StudentStatusLabel | null;
  currentStage: string | null;
  progressPercentage: number | null;
  overdueCount: number;
  requiresAdministrativeAction: boolean;
}

export interface AcademicProgressOverview {
  totalStudents: number;
  byStatusLabel: Record<StudentStatusLabel, number>;
  requiringAction: number;
  students: StudentProgressSummaryRow[];
  error: string | null;
}

/**
 * Institution-wide academic-progress overview for Management. Reuses
 * getStudentAcademicStatus() (lib/academic/status-engine.ts) per active
 * student rather than reimplementing any status logic here — this module
 * only aggregates its output. Computed on every request, never persisted,
 * per explicit instruction. With zero students seeded (Phase 3's
 * intentional empty state), every count below is correctly zero rather
 * than an error.
 */
export async function getAcademicProgressOverview(): Promise<AcademicProgressOverview> {
  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from("students")
    .select(
      `
      id,
      student_number,
      profile:profiles ( full_name ),
      program:programs ( name, degree_level )
    `
    )
    .eq("status", "active")
    .order("student_number");

  if (error) {
    console.error("getAcademicProgressOverview students query failed:", error);
    return {
      totalStudents: 0,
      byStatusLabel: emptyByStatusLabel(),
      requiringAction: 0,
      students: [],
      error: "Could not load academic progress overview.",
    };
  }

  const rows = (students ?? []) as unknown as {
    id: string;
    student_number: string;
    profile: { full_name: string } | null;
    program: { name: string; degree_level: string } | null;
  }[];

  const statuses = await Promise.all(rows.map((r) => getStudentAcademicStatus(r.id)));

  const byStatusLabel = emptyByStatusLabel();
  let requiringAction = 0;

  const summaryRows: StudentProgressSummaryRow[] = rows.map((r, i) => {
    const status = statuses[i];
    if (status) {
      byStatusLabel[status.statusLabel]++;
      if (status.requiresAdministrativeAction) requiringAction++;
    }
    return {
      id: r.id,
      student_number: r.student_number,
      full_name: r.profile?.full_name ?? "(no profile)",
      program_name: r.program?.name ?? "—",
      degree_level: r.program?.degree_level ?? "—",
      statusLabel: status?.statusLabel ?? null,
      currentStage: status?.currentStage ?? null,
      progressPercentage: status?.progressPercentage ?? null,
      overdueCount: status?.overdueMilestones.length ?? 0,
      requiresAdministrativeAction: status?.requiresAdministrativeAction ?? false,
    };
  });

  return {
    totalStudents: rows.length,
    byStatusLabel,
    requiringAction,
    students: summaryRows,
    error: null,
  };
}

function emptyByStatusLabel(): Record<StudentStatusLabel, number> {
  return STUDENT_STATUS_LABELS.reduce(
    (acc, label) => ({ ...acc, [label]: 0 }),
    {} as Record<StudentStatusLabel, number>
  );
}
