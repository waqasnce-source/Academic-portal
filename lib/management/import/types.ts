/**
 * Shared shapes for the bulk-import engine (lib/management/import/*).
 * No "server-only" here — these are plain types shared with the client
 * wizard component, which needs them to render the preview table.
 */

export type ImportType = "courses" | "offerings" | "students" | "enrollments";

/** Passed through from a contextual entry point (e.g. the Semester Operations dashboard's "Import Offerings" link) so rows targeting a different semester can be flagged rather than silently imported somewhere the user didn't intend. Only meaningful for "offerings" and "enrollments", which resolve a semester per-row from the spreadsheet itself. */
export interface ExpectedSemester {
  academicYear: string;
  name: string;
}

export type RowStatus = "valid" | "warning" | "error";

/** One parsed spreadsheet row after validation/matching, before commit. */
export interface ImportRowResult<TResolved> {
  /** 1-indexed, matching the spreadsheet's own row numbers (header = row 1). */
  rowNumber: number;
  status: RowStatus;
  messages: string[];
  raw: Record<string, string>;
  /** Fully resolved, ready-to-write data — null when status is "error" and nothing usable was resolved. */
  resolved: TResolved | null;
}

export interface ImportPreview<TResolved> {
  type: ImportType;
  rows: ImportRowResult<TResolved>[];
  validCount: number;
  warningCount: number;
  errorCount: number;
}

/** Result of actually committing a previously-validated preview to the database. */
export interface ImportOutcome {
  created: number;
  /** Matched an existing record and made no change — the idempotent "already existed" case. */
  matched: number;
  /** Error rows, or rows the confirm step chose not to attempt. */
  skipped: number;
  errors: { rowNumber: number; message: string }[];
}
