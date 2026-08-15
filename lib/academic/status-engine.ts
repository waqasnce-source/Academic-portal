import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getApplicableMilestoneTemplates,
  getStudentMilestoneRecords,
  buildEffectiveMilestones,
  TERMINAL_GOOD_STATUSES,
  type EffectiveMilestone,
  type MilestoneDegreeLevel,
  type PhdEntryBasis,
} from "./milestones";
import {
  getExtensionApplicationsForStudent,
  findActiveExtension,
  type ExtensionApplicationRow,
} from "./extensions";

/**
 * The six-value overall status vocabulary. Distinct from
 * student_milestones.status (which describes one milestone's own state) —
 * this is the aggregate judgment computed by this engine, never stored
 * anywhere (no column exists for it on any table, by explicit instruction).
 */
export const STUDENT_STATUS_LABELS = [
  "ON_TRACK",
  "DUE_SOON",
  "DELAYED",
  "EXTENDED",
  "COMPLETED",
  "ON_HOLD",
] as const;
export type StudentStatusLabel = (typeof STUDENT_STATUS_LABELS)[number];

/** How many days ahead counts as "upcoming" for upcomingDeadlines. Not a hard-coded deadline rule — just a display window. */
const UPCOMING_DEADLINE_WINDOW_DAYS = 30;

export interface StatusEngineResult {
  currentStage: string | null;
  currentMilestone: EffectiveMilestone | null;
  nextMilestone: EffectiveMilestone | null;
  progressPercentage: number;
  completedMilestones: EffectiveMilestone[];
  overdueMilestones: EffectiveMilestone[];
  upcomingDeadlines: EffectiveMilestone[];
  extensionStatus: {
    active: boolean;
    extension: ExtensionApplicationRow | null;
  };
  statusLabel: StudentStatusLabel;
  requiresAdministrativeAction: boolean;
}

export interface StatusEngineStudentInfo {
  degreeLevel: MilestoneDegreeLevel;
  programId: string | null;
  phdEntryBasis: PhdEntryBasis | null;
}

/**
 * Pure computation — takes already-fetched data and returns the
 * structured result. Kept separate from getStudentAcademicStatus() below
 * so the logic itself is testable without a database. Never stores its
 * result; the caller re-derives it from milestone records every time it's
 * needed, per explicit instruction.
 */
export function computeAcademicStatus(
  templates: Awaited<ReturnType<typeof getApplicableMilestoneTemplates>>,
  records: Awaited<ReturnType<typeof getStudentMilestoneRecords>>,
  extensions: ExtensionApplicationRow[],
  today: Date = new Date()
): StatusEngineResult {
  const effective = buildEffectiveMilestones(templates, records);
  const todayStr = today.toISOString().slice(0, 10);

  const requiredMilestones = effective.filter((m) => m.required);
  const completedMilestones = effective.filter((m) =>
    (TERMINAL_GOOD_STATUSES as readonly string[]).includes(m.status)
  );
  const requiredCompleted = requiredMilestones.filter((m) =>
    (TERMINAL_GOOD_STATUSES as readonly string[]).includes(m.status)
  );

  // currentMilestone: the first required milestone (by sequence_no, already
  // sorted by the query) not yet in a terminal-good state — "where the
  // student currently stands."
  const currentMilestone =
    requiredMilestones.find((m) => !(TERMINAL_GOOD_STATUSES as readonly string[]).includes(m.status)) ?? null;

  // nextMilestone: the required milestone immediately after currentMilestone
  // in sequence order — "what follows once the current one is done."
  const nextMilestone = currentMilestone
    ? requiredMilestones.find((m) => m.sequence_no > currentMilestone.sequence_no) ?? null
    : null;

  const currentStage = currentMilestone?.category ?? (requiredMilestones.length > 0 ? null : null);

  // Overdue is determined ONLY from an explicit due_date having passed —
  // never from target_semester/target_days_after_* alone, per the explicit
  // instruction not to auto-flag overdue solely from semester count.
  // target_semester/target_days_after_* remain purely informational
  // targets (surfaced to the UI as "expected by"), not an auto-deadline.
  const activeExtension = findActiveExtension(extensions, today);
  const overdueMilestones = activeExtension
    ? []
    : effective.filter(
        (m) =>
          m.record?.due_date != null &&
          m.record.due_date < todayStr &&
          !(TERMINAL_GOOD_STATUSES as readonly string[]).includes(m.status)
      );

  const upcomingCutoff = new Date(today);
  upcomingCutoff.setDate(upcomingCutoff.getDate() + UPCOMING_DEADLINE_WINDOW_DAYS);
  const upcomingCutoffStr = upcomingCutoff.toISOString().slice(0, 10);

  const upcomingDeadlines = effective.filter(
    (m) =>
      m.record?.due_date != null &&
      m.record.due_date >= todayStr &&
      m.record.due_date <= upcomingCutoffStr &&
      !(TERMINAL_GOOD_STATUSES as readonly string[]).includes(m.status)
  );

  const progressPercentage =
    requiredMilestones.length > 0
      ? Math.round((requiredCompleted.length / requiredMilestones.length) * 100)
      : 0;

  const isOnHold = currentMilestone?.status === "corrections_required";
  const pendingExtensionReview = extensions.some(
    (e) => e.status === "submitted" || e.status === "under_review"
  );

  let statusLabel: StudentStatusLabel;
  if (currentMilestone === null) {
    statusLabel = "COMPLETED";
  } else if (activeExtension) {
    statusLabel = "EXTENDED";
  } else if (isOnHold) {
    statusLabel = "ON_HOLD";
  } else if (overdueMilestones.length > 0) {
    statusLabel = "DELAYED";
  } else if (upcomingDeadlines.length > 0) {
    statusLabel = "DUE_SOON";
  } else {
    statusLabel = "ON_TRACK";
  }

  const requiresAdministrativeAction =
    overdueMilestones.length > 0 || isOnHold || pendingExtensionReview;

  return {
    currentStage,
    currentMilestone,
    nextMilestone,
    progressPercentage,
    completedMilestones,
    overdueMilestones,
    upcomingDeadlines,
    extensionStatus: {
      active: activeExtension !== null,
      extension: activeExtension,
    },
    statusLabel,
    requiresAdministrativeAction,
  };
}

/**
 * Fetches everything computeAcademicStatus() needs for one student and
 * returns the structured result. This is the function future Student/
 * Faculty dashboard pages should call — it does not itself enforce
 * authorization (every underlying query goes through the normal
 * server-side Supabase client, so RLS is the actual gate, same convention
 * as every lib/management/*.ts read function).
 */
export async function getStudentAcademicStatus(studentId: string): Promise<StatusEngineResult | null> {
  const supabase = await createClient();

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, phd_entry_basis, program:programs ( id, degree_level )")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    console.error("getStudentAcademicStatus: could not load student:", studentError);
    return null;
  }

  const program = student.program as unknown as { id: string; degree_level: MilestoneDegreeLevel } | null;
  if (!program) {
    console.error("getStudentAcademicStatus: student has no program");
    return null;
  }

  const [templates, records, extensions] = await Promise.all([
    getApplicableMilestoneTemplates(
      program.degree_level,
      program.id,
      (student.phd_entry_basis as PhdEntryBasis | null) ?? null
    ),
    getStudentMilestoneRecords(studentId),
    getExtensionApplicationsForStudent(studentId),
  ]);

  return computeAcademicStatus(templates, records, extensions);
}
