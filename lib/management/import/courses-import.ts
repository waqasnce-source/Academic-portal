import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createCourse, type CourseInput } from "@/lib/management/courses";
import { COURSE_STATUSES, type CourseStatus, type DegreeLevel } from "@/lib/management/status-enums";
import { courseDegreeLevel } from "@/lib/management/academic-sessions";
import type { ImportPreview, ImportRowResult, ImportOutcome, RowStatus } from "./types";
import { matchDepartment, matchCourseCode, normalizeLoose } from "./matchers";

export type CourseResolved =
  | { action: "create"; input: CourseInput }
  | { action: "match"; existingId: string; code: string };

interface ReferenceData {
  departments: { id: string; name: string }[];
  courses: {
    id: string;
    code: string;
    credit_hours: number;
    department: { id: string; name: string };
    program_courses: { program: { degree_level: DegreeLevel } | null }[] | null;
  }[];
}

async function loadReferenceData(): Promise<ReferenceData> {
  const supabase = await createClient();
  const [departmentsRes, coursesRes] = await Promise.all([
    supabase.from("departments").select("id, name").order("name"),
    supabase
      .from("courses")
      .select(
        `id, code, credit_hours,
         department:departments!inner ( id, name ),
         program_courses ( program:programs ( degree_level ) )`
      ),
  ]);
  return {
    departments: departmentsRes.data ?? [],
    courses: (coursesRes.data ?? []) as unknown as ReferenceData["courses"],
  };
}

/** "MS/M.Phil.", "MS", "MPhil", "Masters" -> master; "PhD", "Ph.D." -> phd; anything else -> null (unrecognized, not an error — the column is informational). */
function parseImportedDegreeLevel(raw: string): DegreeLevel | null {
  const key = normalizeLoose(raw).replace(/[.\s/-]/g, "");
  if (!key) return null;
  if (["ms", "mphil", "msmphil", "masters", "master"].includes(key)) return "master";
  if (["phd", "doctorate", "doctoral"].includes(key)) return "phd";
  return null;
}

export async function validateCourseImportRows(
  rawRows: { rowNumber: number; values: Record<string, string> }[]
): Promise<ImportPreview<CourseResolved>> {
  const ref = await loadReferenceData();
  const seenInFile = new Map<string, { rowNumber: number; code: string }>();

  const rows: ImportRowResult<CourseResolved>[] = rawRows.map(({ rowNumber, values }) => {
    const messages: string[] = [];
    let status: RowStatus = "valid";

    const code = (values["Course Code"] ?? "").trim();
    const title = (values["Course Title"] ?? "").trim();
    const disciplineRaw = (values["Discipline"] ?? "").trim();
    const creditHoursRaw = (values["Credit Hours"] ?? "").trim();
    const degreeLevelRaw = (values["Degree Level"] ?? "").trim();
    const statusRaw = (values["Status"] ?? "").trim();

    if (!code) {
      return { rowNumber, status: "error", messages: ["Course Code is missing."], raw: values, resolved: null };
    }
    if (!title) {
      return { rowNumber, status: "error", messages: ["Course Title is missing."], raw: values, resolved: null };
    }
    if (!disciplineRaw) {
      return { rowNumber, status: "error", messages: ["Discipline is missing."], raw: values, resolved: null };
    }
    if (!creditHoursRaw) {
      return { rowNumber, status: "error", messages: ["Credit Hours is missing."], raw: values, resolved: null };
    }

    const creditHours = Number(creditHoursRaw);
    if (!Number.isFinite(creditHours) || creditHours <= 0 || creditHours > 99.9) {
      return {
        rowNumber,
        status: "error",
        messages: [`Credit Hours "${creditHoursRaw}" is not a valid positive number.`],
        raw: values,
        resolved: null,
      };
    }
    const roundedCreditHours = Math.round(creditHours * 10) / 10;

    const deptMatch = matchDepartment(disciplineRaw, ref.departments);
    if (deptMatch.ambiguous) {
      return {
        rowNumber,
        status: "error",
        messages: [`Discipline "${disciplineRaw}" matches multiple departments — cannot resolve automatically.`],
        raw: values,
        resolved: null,
      };
    }
    if (!deptMatch.match) {
      return {
        rowNumber,
        status: "error",
        messages: [`Discipline "${disciplineRaw}" does not match any existing department.`],
        raw: values,
        resolved: null,
      };
    }

    let courseStatus: CourseStatus = "active";
    if (statusRaw) {
      if ((COURSE_STATUSES as readonly string[]).includes(statusRaw.toLowerCase())) {
        courseStatus = statusRaw.toLowerCase() as CourseStatus;
      } else {
        messages.push(`Status "${statusRaw}" is not recognized — defaulting to "active".`);
        status = "warning";
      }
    }

    // Intra-file duplicate: same code appearing twice in this upload.
    const codeKey = normalizeLoose(code);
    const seen = seenInFile.get(codeKey);
    if (seen) {
      return {
        rowNumber,
        status: "warning",
        messages: [`Duplicate of row ${seen.rowNumber} in this file (same course code) — will not be imported again.`],
        raw: values,
        resolved: { action: "match", existingId: "", code: seen.code },
      };
    }

    const existing = matchCourseCode(code, ref.courses);
    if (existing) {
      // Idempotent: an existing course is never overwritten by a re-import
      // — only flagged if the imported row's data looks different, so a
      // human can decide whether to edit it manually via Course Catalogue.
      if (Math.abs(existing.credit_hours - roundedCreditHours) > 0.01) {
        messages.push(
          `Course already exists with ${existing.credit_hours} CH — import row says ${roundedCreditHours} CH. Existing value kept; edit the course manually if this needs to change.`
        );
        status = "warning";
      }
      if (existing.department.id !== deptMatch.match.id) {
        messages.push(
          `Course already exists under "${existing.department.name}" — import row says "${deptMatch.match.name}". Existing value kept.`
        );
        status = "warning";
      }
      const importedLevel = parseImportedDegreeLevel(degreeLevelRaw);
      if (importedLevel) {
        const structural = courseDegreeLevel({ code: existing.code, program_courses: existing.program_courses });
        if (structural.level && structural.level !== importedLevel) {
          messages.push(
            `Course is structurally classified as "${structural.level === "phd" ? "Ph.D." : "MS/M.Phil."}" (via program linkage), but the import says "${degreeLevelRaw}". Not overridden — Degree Level is derived, not stored directly.`
          );
          status = "warning";
        }
      }
      seenInFile.set(codeKey, { rowNumber, code: existing.code });
      return {
        rowNumber,
        status,
        messages: messages.length > 0 ? messages : ["Course already exists — matched, no changes made."],
        raw: values,
        resolved: { action: "match", existingId: existing.id, code: existing.code },
      };
    }

    seenInFile.set(codeKey, { rowNumber, code });
    if (degreeLevelRaw) {
      messages.push(
        "Degree Level is informational only for new courses — courses don't store it directly; it's derived from program linkage once the course is added to a program's curriculum."
      );
      status = "warning";
    }

    return {
      rowNumber,
      status,
      messages: messages.length > 0 ? messages : ["Ready to create."],
      raw: values,
      resolved: {
        action: "create",
        input: { department_id: deptMatch.match.id, code, name: title, credit_hours: roundedCreditHours, status: courseStatus },
      },
    };
  });

  return {
    type: "courses",
    rows,
    validCount: rows.filter((r) => r.status === "valid").length,
    warningCount: rows.filter((r) => r.status === "warning").length,
    errorCount: rows.filter((r) => r.status === "error").length,
  };
}

export async function commitCourseImportRows(rows: ImportRowResult<CourseResolved>[]): Promise<ImportOutcome> {
  const outcome: ImportOutcome = { created: 0, matched: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    if (!row.resolved) {
      outcome.skipped++;
      continue;
    }
    if (row.resolved.action === "match") {
      outcome.matched++;
      continue;
    }
    const { error } = await createCourse(row.resolved.input);
    if (error) {
      outcome.errors.push({ rowNumber: row.rowNumber, message: error.message });
      outcome.skipped++;
    } else {
      outcome.created++;
    }
  }

  return outcome;
}
