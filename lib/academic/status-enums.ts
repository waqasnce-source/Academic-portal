/**
 * Client-safe status/enum constants for lib/academic — mirrors the same
 * fix already applied to lib/management/status-enums.ts. lib/academic/*.ts
 * files start with "server-only", so a Client Component (e.g. the faculty
 * milestone-update form) importing a runtime const from one of them would
 * pull a server-only module into the browser bundle and fail the build.
 * This file has NO "server-only" import; each server module re-exports
 * its slice of these for backward compatibility with existing imports.
 */

/** Mirrors student_milestones.status's CHECK constraint exactly. */
export const STUDENT_MILESTONE_STATUSES = [
  "not_started",
  "pending",
  "in_progress",
  "submitted",
  "under_review",
  "approved",
  "corrections_required",
  "completed",
  "overdue",
  "waived",
  "not_applicable",
] as const;
export type StudentMilestoneStatus = (typeof STUDENT_MILESTONE_STATUSES)[number];

/** Mirrors thesis_reviewers.reviewer_type's CHECK constraint exactly. */
export const THESIS_REVIEWER_TYPES = ["foreign", "national"] as const;
export type ThesisReviewerType = (typeof THESIS_REVIEWER_TYPES)[number];
