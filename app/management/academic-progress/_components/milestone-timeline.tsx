"use client";

import Link from "next/link";
import { useState } from "react";
import { MilestoneStatusBadge, formatAcademicDate } from "@/app/_components/academic-status";
import type { EffectiveMilestone } from "@/lib/academic/milestones";
import { ELIGIBILITY_STYLE_MILESTONE_CODES, type CalculatedDeadline, type DeadlineStatus } from "@/lib/academic/progression-rules";
import { MilestoneUpdateForm } from "./milestone-update-form";

const DEADLINE_BADGE_STYLE: Record<DeadlineStatus, string> = {
  not_applicable: "hidden",
  not_enough_data: "text-slate-400 dark:text-slate-600",
  not_started: "text-slate-400 dark:text-slate-600",
  on_track: "text-emerald-600 dark:text-emerald-400",
  due_soon: "text-amber-600 dark:text-amber-400",
  overdue: "text-red-600 dark:text-red-400",
  completed_on_time: "text-emerald-600 dark:text-emerald-400",
  completed_late: "text-amber-600 dark:text-amber-400",
};

/** Timeline dot color per milestone status — mirrors MILESTONE_STATUS_TONE in academic-status.tsx's badge tones, as a filled dot instead of a pill. */
const STATUS_DOT_CLASSES: Record<string, string> = {
  not_started: "bg-slate-300 dark:bg-slate-700",
  pending: "bg-slate-300 dark:bg-slate-700",
  in_progress: "bg-blue-500",
  submitted: "bg-blue-500",
  under_review: "bg-blue-500",
  approved: "bg-emerald-500",
  corrections_required: "bg-amber-500",
  completed: "bg-emerald-500",
  overdue: "bg-red-500",
  waived: "bg-slate-300 dark:bg-slate-700",
  not_applicable: "bg-slate-300 dark:bg-slate-700",
};

function deadlineBadgeLabel(code: string, status: DeadlineStatus): string {
  if (ELIGIBILITY_STYLE_MILESTONE_CODES.has(code)) {
    if (status === "overdue") return "Eligible";
    if (status === "due_soon" || status === "on_track") return "Not yet eligible";
    if (status === "not_started") return "Date unavailable";
  }
  const labels: Record<DeadlineStatus, string> = {
    not_applicable: "",
    not_enough_data: "Not enough data",
    not_started: "Not started",
    on_track: "On track",
    due_soon: "Due soon",
    overdue: "Overdue",
    completed_on_time: "Completed on time",
    completed_late: "Completed late",
  };
  return labels[status];
}

/**
 * Milestone codes actually written by syncStudentMilestoneByCode()
 * somewhere in the codebase today (confirmed by grepping every call site
 * before writing this — app/management/{students,thesis,research-proposals}/
 * actions.ts) — the true "automatically derived" set, not a guess. Every
 * other milestone_code (including SUPERVISOR_APPROVAL and
 * EXTENSION_APPLICATION, even though supervisor_assignments/
 * extension_applications both exist as structured data) is management
 * entry only; see the delivery report for why those two specifically
 * were left as a documented gap rather than silently wired up.
 */
const AUTO_SYNCED_MILESTONE_CODES = new Set([
  "COURSE_WORK",
  "COURSEWORK",
  "GSC_PRESENTATION",
  "ASRB_PRESENTATION",
  "CORRECTED_PROPOSAL_SUBMISSION",
  "THESIS_SUBMISSION",
  "THESIS_CORRECTIONS",
  "VIVA_VOCE",
  "DEFENCE_VIVA_VOCE",
  "RESULT_DECLARATION",
]);

export interface MilestoneSourceLink {
  label: string;
  href: string;
}

export interface MilestoneDocumentSummary {
  total: number;
  submittedCount: number;
  needsCorrection: boolean;
}

export function MilestoneTimeline({
  studentId,
  milestones,
  documentSummaryByMilestone,
  verifiedByNames,
  sourceLinkByCode,
  deadlinesByCode,
}: {
  studentId: string;
  milestones: EffectiveMilestone[];
  documentSummaryByMilestone: Map<string, MilestoneDocumentSummary>;
  verifiedByNames: Map<string, string>;
  sourceLinkByCode: Map<string, MilestoneSourceLink>;
  deadlinesByCode: Map<string, CalculatedDeadline>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ol className="relative ml-2 space-y-3 border-l-2 border-slate-200 pl-6 dark:border-slate-800">
      {milestones.map((m) => {
        const isAuto = AUTO_SYNCED_MILESTONE_CODES.has(m.milestone_code);
        const docSummary = documentSummaryByMilestone.get(m.id);
        const sourceLink = sourceLinkByCode.get(m.milestone_code);
        const isExpanded = expandedId === m.id;
        const relevantDate = m.record?.completed_date ?? m.record?.due_date ?? m.record?.planned_date ?? null;
        const deadline = deadlinesByCode.get(m.milestone_code);
        const deadlineLabel = deadline ? deadlineBadgeLabel(m.milestone_code, deadline.status) : "";

        return (
          <li key={m.id} className="relative">
            <span
              className={`absolute top-5 -left-[31px] h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-slate-950 ${STATUS_DOT_CLASSES[m.status] ?? "bg-slate-300 dark:bg-slate-700"}`}
            />
            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : m.id)}
                className="flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left"
              >
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Step {m.sequence_no}
                    {m.category ? ` · ${m.category}` : ""}
                    {!m.required ? " · Optional" : ""}
                    {" · "}
                    <span className={isAuto ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}>
                      {isAuto ? "Automatically derived" : "Management entry"}
                    </span>
                  </p>
                  <p className="mt-0.5 font-medium text-slate-900 dark:text-slate-50">{m.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {relevantDate ? formatAcademicDate(relevantDate) : "No date recorded"}
                    {docSummary && (
                      <span className={docSummary.needsCorrection ? "ml-2 text-amber-600 dark:text-amber-400" : "ml-2"}>
                        · Documents: {docSummary.submittedCount}/{docSummary.total}
                        {docSummary.needsCorrection ? " · correction requested" : ""}
                      </span>
                    )}
                    {deadline && deadline.status !== "not_applicable" && (
                      <span className={`ml-2 font-medium ${DEADLINE_BADGE_STYLE[deadline.status]}`} title={deadline.basis}>
                        · {deadlineLabel}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <MilestoneStatusBadge status={m.status} />
                  <span className="text-xs text-slate-400 dark:text-slate-600">{isExpanded ? "Hide" : "Details"}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-800">
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <DetailField label="Planned Date" value={formatAcademicDate(m.record?.planned_date)} />
                  <DetailField label="Due Date" value={formatAcademicDate(m.record?.due_date)} />
                  <DetailField label="Completed Date" value={formatAcademicDate(m.record?.completed_date)} />
                  <DetailField
                    label="Verified"
                    value={
                      m.record?.verified_date
                        ? `${formatAcademicDate(m.record.verified_date)}${m.record.verified_by ? ` by ${verifiedByNames.get(m.record.verified_by) ?? "—"}` : ""}`
                        : "Not verified"
                    }
                  />
                </dl>
                {deadline && deadline.status !== "not_applicable" && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Calculated Deadline (NCEG rule)</p>
                    <p className={`mt-0.5 text-sm font-medium ${DEADLINE_BADGE_STYLE[deadline.status]}`}>{deadlineBadgeLabel(m.milestone_code, deadline.status)}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{deadline.basis} — calculated live, not stored</p>
                  </div>
                )}
                {m.record?.remarks && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Remarks</p>
                    <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{m.record.remarks}</p>
                  </div>
                )}
                {m.description && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Description</p>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{m.description}</p>
                  </div>
                )}
                {sourceLink && (
                  <Link href={sourceLink.href} className="inline-block text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
                    {sourceLink.label} →
                  </Link>
                )}

                <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Update Milestone
                    {isAuto && (
                      <span className="ml-2 normal-case text-amber-600 dark:text-amber-400">
                        — this status is normally kept in sync automatically; editing it here overrides that until the
                        source record changes again.
                      </span>
                    )}
                  </p>
                  <MilestoneUpdateForm studentId={studentId} milestone={m} />
                </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-900 dark:text-slate-50">{value}</dd>
    </div>
  );
}
