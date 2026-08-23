import type { EffectiveMilestone, MilestoneDegreeLevel, PhdEntryBasis } from "./milestones";

/**
 * Mirrors TERMINAL_GOOD_STATUSES from milestones.ts exactly. Duplicated
 * (not imported) deliberately: milestones.ts imports "server-only", and
 * this module is imported by the (client) milestone-timeline.tsx for its
 * display constants/types — importing a value from milestones.ts here
 * would drag "server-only" into the browser bundle, the exact problem
 * status-enums.ts's own top-of-file comment documents solving the same
 * way. This file has no "server-only" import itself, and none of its
 * functions perform any I/O — every one is a pure computation over
 * already-fetched data, so it needs none.
 */
const TERMINAL_GOOD_STATUSES = ["completed", "approved", "waived", "not_applicable"] as const;

/**
 * Calculated-deadline / progression-rule engine (NCEG curriculum phase).
 *
 * Source of truth: the NCEG MS/M.Phil. and Ph.D. work-plan supplied in the
 * task (coursework CH + semester ceilings, supervisor/proposal semester
 * ceilings, comprehensive-exam/research-period day windows, extension
 * thresholds). Every semester-ceiling and day-window number this module
 * needs already exists as real, previously-seeded data on
 * milestone_templates (target_semester / target_days_after_prerequisite /
 * prerequisite_milestone_id — verified live against the database before
 * writing this file, not assumed) EXCEPT the two constants declared below
 * (coursework CH totals, extension semester thresholds), which have no
 * column anywhere and are therefore encoded here, citing the source
 * sections that supplied them. This module never writes to the database
 * and never mutates milestone_templates/student_milestones — same "pure
 * computation, never stores its result" convention as status-engine.ts and
 * degree-audit.ts.
 */

// ---------------------------------------------------------------
// Coursework credit-hour policy (NCEG source, task §2 / §12)
// ---------------------------------------------------------------

/**
 * Total coursework CH required per pathway. Not derivable from any
 * existing column — curriculum_requirements only has category-level
 * quota rows (summing to 18 for MS/M.Phil., none at all for Ph.D.), which
 * do not match these supplied figures; see the phase report for why that
 * table was left untouched rather than silently overwritten.
 */
export const NCEG_COURSEWORK_CH_REQUIREMENT = {
  master: 24,
  phd_ms_mphil_llm: 24,
  phd_bs_master: 48,
} as const;

/**
 * Ph.D. coursework CH depends on phd_entry_basis (students.phd_entry_basis,
 * an existing column — no schema change needed). Returns null when the
 * degree level isn't covered by the supplied source (diploma/bachelor) or
 * a Ph.D. student's entry basis hasn't been recorded — never guesses.
 */
export function getRequiredCourseworkCreditHours(
  degreeLevel: MilestoneDegreeLevel,
  phdEntryBasis: PhdEntryBasis | null
): number | null {
  if (degreeLevel === "master") return NCEG_COURSEWORK_CH_REQUIREMENT.master;
  if (degreeLevel === "phd") {
    if (phdEntryBasis === "ms_mphil_llm") return NCEG_COURSEWORK_CH_REQUIREMENT.phd_ms_mphil_llm;
    if (phdEntryBasis === "bs_master") return NCEG_COURSEWORK_CH_REQUIREMENT.phd_bs_master;
    return null;
  }
  return null;
}

// ---------------------------------------------------------------
// Extension threshold (NCEG source, task §8) — no existing column
// ---------------------------------------------------------------

export const EXTENSION_THRESHOLD_SEMESTER: Record<"master" | "phd", number> = { master: 4, phd: 6 };

export interface ExtensionThresholdAssessment {
  thresholdSemester: number;
  semestersElapsed: number | null;
  thresholdReached: boolean;
  hasAnyExtensionRecord: boolean;
  hasActiveExtension: boolean;
  /** Threshold reached AND no extension application exists at all — an actionable gap, not an assumption that one is required. */
  alert: boolean;
}

export function evaluateExtensionThreshold(
  degreeLevel: "master" | "phd",
  semestersElapsed: number | null,
  extensions: { status: string }[]
): ExtensionThresholdAssessment {
  const thresholdSemester = EXTENSION_THRESHOLD_SEMESTER[degreeLevel];
  const thresholdReached = semestersElapsed != null && semestersElapsed >= thresholdSemester;
  const hasAnyExtensionRecord = extensions.length > 0;
  return {
    thresholdSemester,
    semestersElapsed,
    thresholdReached,
    hasAnyExtensionRecord,
    hasActiveExtension: extensions.some((e) => e.status === "approved"),
    alert: thresholdReached && !hasAnyExtensionRecord,
  };
}

// ---------------------------------------------------------------
// Semester-elapsed proxy
// ---------------------------------------------------------------

export interface SemesterCalendarEntry {
  academicYear: string;
  startDate: string;
}

/**
 * "Semesters elapsed since admission" for one student — the schema stores
 * only students.admission_year (a plain year, no admission date and no
 * maintained semester-index counter), so this counts real institution
 * semesters (semesters.academic_year/start_date, already fetched by
 * getAcademicSessionsOverview()) whose academic_year's starting calendar
 * year is >= admissionYear and whose start_date has already occurred
 * on/before asOfIso.
 *
 * Documented limitation (not silently assumed away): this is a calendar
 * proxy, not a personally-tracked semester count — it assumes continuous
 * institution-wide progression and does not account for an individual
 * student's leave-of-absence gaps. Returns null (not 0) when there is no
 * semester calendar data at all to count against, so callers can
 * distinguish "zero semesters have elapsed" from "we cannot tell."
 */
export function countSemestersSinceAdmission(
  admissionYear: number,
  semesters: SemesterCalendarEntry[],
  asOfIso: string
): number | null {
  if (semesters.length === 0) return null;
  return semesters.filter((s) => {
    const startYear = Number.parseInt(s.academicYear.slice(0, 4), 10);
    if (!Number.isFinite(startYear) || startYear < admissionYear) return false;
    return s.startDate <= asOfIso;
  }).length;
}

// ---------------------------------------------------------------
// Calculated milestone deadlines
// ---------------------------------------------------------------

export const DEADLINE_STATUSES = [
  "not_applicable",
  "not_enough_data",
  "not_started",
  "on_track",
  "due_soon",
  "overdue",
  "completed_on_time",
  "completed_late",
] as const;
export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number];

export const DEADLINE_STATUS_LABELS: Record<DeadlineStatus, string> = {
  not_applicable: "Not applicable",
  not_enough_data: "Not enough data",
  not_started: "Not started",
  on_track: "On track",
  due_soon: "Due soon",
  overdue: "Overdue",
  completed_on_time: "Completed on time",
  completed_late: "Completed late",
};

export interface CalculatedDeadline {
  milestoneCode: string;
  title: string;
  status: DeadlineStatus;
  /** Human-readable explanation of what the deadline is measured against. */
  basis: string;
  /** ISO date, only set for target_days_after_prerequisite-based rules (a real calendar date could be computed). */
  deadlineDate: string | null;
  targetSemester: number | null;
}

const DUE_SOON_WINDOW_DAYS = 30;

/**
 * The two "minimum research period" milestones where being past the
 * calculated date is the GOOD outcome (eligible), not a bad one (overdue)
 * — shared between every consumer that renders a DeadlineStatus so the
 * eligibility framing (task §6: Eligible/Not yet eligible/Date
 * unavailable) is applied consistently rather than redefined per component.
 */
export const ELIGIBILITY_STYLE_MILESTONE_CODES = new Set(["THESIS_RESEARCH_PERIOD", "RESEARCH_PERIOD"]);

function isDoneStatus(status: string): boolean {
  return (TERMINAL_GOOD_STATUSES as readonly string[]).includes(status);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function result(m: EffectiveMilestone, status: DeadlineStatus, basis: string, deadlineDate: string | null): CalculatedDeadline {
  return { milestoneCode: m.milestone_code, title: m.title, status, basis, deadlineDate, targetSemester: m.target_semester };
}

/**
 * Evaluates ONE effective milestone's calculated deadline, driven only by
 * milestone_templates.target_semester / target_days_after_prerequisite +
 * (for the latter) the prerequisite milestone's own completed_date — real
 * fields, already seeded with the NCEG-supplied numbers. Never reads or
 * writes student_milestones.due_date (that field remains management's own
 * manually-set expectation, a separate concept from this calculated rule).
 * Recomputed fresh on every call — nothing here is persisted.
 */
export function evaluateMilestoneDeadline(
  milestone: EffectiveMilestone,
  allEffective: EffectiveMilestone[],
  context: { admissionYear: number | null; semesters: SemesterCalendarEntry[] },
  todayIso: string
): CalculatedDeadline {
  const isDone = isDoneStatus(milestone.status);
  const completedDateIso = milestone.record?.completed_date ?? null;

  if (milestone.target_semester != null) {
    if (context.admissionYear == null) {
      return result(milestone, "not_enough_data", `Target: semester ${milestone.target_semester} (admission year unknown)`, null);
    }
    if (isDone) {
      if (!completedDateIso) {
        return result(milestone, "not_enough_data", `Target: semester ${milestone.target_semester} (no completion date recorded)`, null);
      }
      const semAtCompletion = countSemestersSinceAdmission(context.admissionYear, context.semesters, completedDateIso);
      if (semAtCompletion == null) return result(milestone, "not_enough_data", `Target: semester ${milestone.target_semester}`, null);
      const status: DeadlineStatus = semAtCompletion <= milestone.target_semester ? "completed_on_time" : "completed_late";
      return result(milestone, status, `Target: semester ${milestone.target_semester}; completed in semester ${semAtCompletion}`, null);
    }
    const semNow = countSemestersSinceAdmission(context.admissionYear, context.semesters, todayIso);
    if (semNow == null) return result(milestone, "not_enough_data", `Target: semester ${milestone.target_semester} (no semester calendar data)`, null);
    if (semNow === 0) return result(milestone, "not_started", `Target: semester ${milestone.target_semester}`, null);
    let status: DeadlineStatus;
    if (semNow > milestone.target_semester) status = "overdue";
    else if (semNow >= milestone.target_semester - 1) status = "due_soon";
    else status = "on_track";
    return result(milestone, status, `Target: semester ${milestone.target_semester}; currently semester ${semNow}`, null);
  }

  if (milestone.target_days_after_prerequisite != null && milestone.prerequisite_milestone_id) {
    const prereq = allEffective.find((m) => m.id === milestone.prerequisite_milestone_id);
    const prereqDone = prereq != null && isDoneStatus(prereq.status);
    const prereqDate = prereq?.record?.completed_date ?? null;
    if (!prereq || !prereqDone || !prereqDate) {
      return result(
        milestone,
        "not_started",
        `Applies ${milestone.target_days_after_prerequisite} days after "${prereq?.title ?? "its prerequisite"}" is completed`,
        null
      );
    }
    const deadlineDate = addDaysIso(prereqDate, milestone.target_days_after_prerequisite);
    if (isDone) {
      if (!completedDateIso) return result(milestone, "not_enough_data", `Deadline was ${deadlineDate} (no completion date recorded)`, deadlineDate);
      const status: DeadlineStatus = completedDateIso <= deadlineDate ? "completed_on_time" : "completed_late";
      return result(milestone, status, `Deadline was ${deadlineDate}`, deadlineDate);
    }
    const dueSoonFrom = addDaysIso(deadlineDate, -DUE_SOON_WINDOW_DAYS);
    let status: DeadlineStatus;
    if (todayIso > deadlineDate) status = "overdue";
    else if (todayIso >= dueSoonFrom) status = "due_soon";
    else status = "on_track";
    return result(milestone, status, `Deadline: ${deadlineDate}`, deadlineDate);
  }

  if (milestone.target_days_after_admission != null) {
    // No admission DATE exists anywhere in the schema (only admission_year), so a day-precision deadline from admission can never be computed — a genuine, disclosed data gap, not a fabricated date. (No currently-seeded template actually uses this field.)
    return result(
      milestone,
      "not_enough_data",
      `Target: ${milestone.target_days_after_admission} days after admission (only admission year is on record, not an admission date)`,
      null
    );
  }

  return result(milestone, "not_applicable", "No calculated deadline rule configured for this milestone", null);
}

/** Calculated deadlines for every applicable milestone that actually has a deadline rule configured — skips the rest entirely (they stay "not applicable" implicitly by absence). */
export function computeCalculatedDeadlines(
  effective: EffectiveMilestone[],
  context: { admissionYear: number | null; semesters: SemesterCalendarEntry[] },
  todayIso: string = new Date().toISOString().slice(0, 10)
): CalculatedDeadline[] {
  return effective
    .filter((m) => m.target_semester != null || m.target_days_after_prerequisite != null || m.target_days_after_admission != null)
    .map((m) => evaluateMilestoneDeadline(m, effective, context, todayIso));
}

// ---------------------------------------------------------------
// Degree tenure (NCEG source, task §7) — year-granularity only
// ---------------------------------------------------------------

export interface TenureAssessment {
  status: "not_enough_data" | "estimated";
  estimatedTenureEndYear: number | null;
  note: string;
}

/**
 * The supplied rule ties thesis-submission deadlines to "3/6 months before
 * the last day of the extended degree tenure" — but the schema only has
 * programs.duration_years (+ duration_verified) and students.admission_year,
 * both year-granularity, never a calendar tenure END DATE. This can
 * therefore only ever produce an estimated YEAR (reusing the exact same
 * fields the existing "Expected Completion" figure already uses on this
 * page), never the month-precision deadline the rule actually asks for.
 * Per explicit instruction, that is surfaced as "not enough data" rather
 * than fabricating a specific date.
 */
export function evaluateDegreeTenure(
  admissionYear: number | null,
  durationYears: number | null,
  durationVerified: boolean,
  approvedExtensionSemesters: number
): TenureAssessment {
  if (admissionYear == null || durationYears == null || !durationVerified) {
    return {
      status: "not_enough_data",
      estimatedTenureEndYear: null,
      note: "Degree tenure end date is not available (program duration is not on record as verified), so the 3/6-month-before-tenure thesis deadline cannot be calculated.",
    };
  }
  const extraYears = approvedExtensionSemesters / 2;
  const estimatedTenureEndYear = admissionYear + Math.ceil(durationYears + extraYears);
  return {
    status: "estimated",
    estimatedTenureEndYear,
    note: "Estimated from admission year + verified program duration (+ approved extension semesters, 2 per year). Only a calendar year is available, not a precise tenure end date, so the exact month-precision thesis-submission deadline cannot be calculated.",
  };
}
