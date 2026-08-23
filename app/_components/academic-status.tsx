import { StatusBadge, type BadgeTone } from "@/app/management/_components/status-badge";
import type { StudentStatusLabel } from "@/lib/academic/status-engine";
import type { StudentMilestoneStatus } from "@/lib/academic/milestones";

/**
 * Shared, role-agnostic rendering for the two status vocabularies used
 * across /student, /faculty, and /management/academic-progress: the
 * engine's aggregate StudentStatusLabel, and a single milestone's own
 * StudentMilestoneStatus. Deliberately outside app/management/_components
 * (this is used by non-Management routes too), but reuses that folder's
 * StatusBadge primitive rather than duplicating the pill-badge styling.
 */
const STATUS_LABEL_TONE: Record<StudentStatusLabel, BadgeTone> = {
  ON_TRACK: "success",
  DUE_SOON: "warning",
  DELAYED: "danger",
  EXTENDED: "info",
  COMPLETED: "success",
  ON_HOLD: "warning",
};

const STATUS_LABEL_TEXT: Record<StudentStatusLabel, string> = {
  ON_TRACK: "On Track",
  DUE_SOON: "Due Soon",
  DELAYED: "Delayed",
  EXTENDED: "Extended",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
};

export function StudentStatusBadge({ statusLabel }: { statusLabel: StudentStatusLabel }) {
  return <StatusBadge label={STATUS_LABEL_TEXT[statusLabel]} tone={STATUS_LABEL_TONE[statusLabel]} />;
}

const MILESTONE_STATUS_TONE: Record<StudentMilestoneStatus, BadgeTone> = {
  not_started: "neutral",
  pending: "neutral",
  in_progress: "info",
  submitted: "info",
  under_review: "info",
  approved: "success",
  corrections_required: "warning",
  completed: "success",
  overdue: "danger",
  waived: "neutral",
  not_applicable: "neutral",
};

export function MilestoneStatusBadge({ status }: { status: StudentMilestoneStatus }) {
  return <StatusBadge label={status.replace(/_/g, " ")} tone={MILESTONE_STATUS_TONE[status]} />;
}

/** `label` defaults to the original milestone-progress caption so every existing caller (student/faculty/management student pages) is unaffected; pass an explicit label for any other percentage (e.g. coursework CH progress). */
export function ProgressBar({ percentage, label }: { percentage: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
        <div
          className="h-full rounded-full bg-brand-700 dark:bg-brand-400"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label ?? `${clamped}% of required milestones complete`}</p>
    </div>
  );
}

export function formatAcademicDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
