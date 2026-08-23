import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createStudent, type StudentInput } from "@/lib/management/students";
import type { DegreeLevel } from "@/lib/management/status-enums";
import type { ImportPreview, ImportRowResult, ImportOutcome, RowStatus } from "./types";
import { matchProgram, matchStudent, normalizeLoose } from "./matchers";

export type StudentResolved =
  | { action: "create"; input: StudentInput }
  | { action: "match"; existingId: string };

interface ReferenceData {
  programs: { id: string; name: string; code: string; degree_level: DegreeLevel }[];
  students: { id: string; student_number: string; email: string | null }[];
}

async function loadReferenceData(): Promise<ReferenceData> {
  const supabase = await createClient();
  const [programsRes, studentsRes] = await Promise.all([
    supabase.from("programs").select("id, name, code, degree_level"),
    supabase.from("students").select("id, student_number, email"),
  ]);
  return {
    programs: programsRes.data ?? [],
    students: studentsRes.data ?? [],
  };
}

function parseImportedDegreeLevel(raw: string): DegreeLevel | null {
  const key = normalizeLoose(raw).replace(/[.\s/-]/g, "");
  if (!key) return null;
  if (["ms", "mphil", "msmphil", "masters", "master"].includes(key)) return "master";
  if (["phd", "doctorate", "doctoral"].includes(key)) return "phd";
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function validateStudentImportRows(
  rawRows: { rowNumber: number; values: Record<string, string> }[]
): Promise<ImportPreview<StudentResolved>> {
  const ref = await loadReferenceData();
  const seenInFile = new Map<string, number>();
  const currentYear = new Date().getFullYear();

  const rows: ImportRowResult<StudentResolved>[] = rawRows.map(({ rowNumber, values }) => {
    const messages: string[] = [];
    let status: RowStatus = "valid";

    const studentId = (values["Student ID"] ?? "").trim();
    const name = (values["Student Name"] ?? "").trim();
    const email = (values["Email"] ?? "").trim();
    const programRaw = (values["Program"] ?? "").trim();
    const degreeLevelRaw = (values["Degree Level"] ?? "").trim();
    const admissionYearRaw = (values["Admission Year"] ?? "").trim();

    if (!name) return { rowNumber, status: "error", messages: ["Student Name is missing."], raw: values, resolved: null };
    if (!email) return { rowNumber, status: "error", messages: ["Email is missing."], raw: values, resolved: null };
    if (!EMAIL_RE.test(email)) {
      return { rowNumber, status: "error", messages: [`Email "${email}" is not a valid email address.`], raw: values, resolved: null };
    }

    // Intra-file duplicate (by whichever identifier is present).
    const fileKey = normalizeLoose(studentId || email);
    const seenRow = seenInFile.get(fileKey);
    if (seenRow) {
      return {
        rowNumber,
        status: "warning",
        messages: [`Duplicate of row ${seenRow} in this file — will not be imported again.`],
        raw: values,
        resolved: { action: "match", existingId: "" },
      };
    }
    seenInFile.set(fileKey, rowNumber);

    const existing = matchStudent(studentId, email, ref.students);
    if (existing) {
      messages.push("Student already exists — matched by " + (studentId ? "student ID" : "email") + ", no changes made.");
      return { rowNumber, status: "valid", messages, raw: values, resolved: { action: "match", existingId: existing.id } };
    }

    // New student: student_number and program_id are NOT NULL in the
    // database even though the task's own column spec marks Student ID
    // and Program as merely "Preferred" — that preference only holds for
    // MATCHING an existing student. Creating a genuinely new one needs both.
    if (!studentId) {
      return {
        rowNumber,
        status: "error",
        messages: ["Student ID is required to create a new student record (the database requires a student number) — provide one, or provide enough detail to match an existing student."],
        raw: values,
        resolved: null,
      };
    }

    const programMatch = matchProgram(programRaw, ref.programs);
    if (!programRaw) {
      return {
        rowNumber,
        status: "error",
        messages: ["Program is required to create a new student record."],
        raw: values,
        resolved: null,
      };
    }
    if (programMatch.ambiguous) {
      return {
        rowNumber,
        status: "error",
        messages: [`Program "${programRaw}" matches multiple programs — cannot resolve automatically.`],
        raw: values,
        resolved: null,
      };
    }
    if (!programMatch.match) {
      return {
        rowNumber,
        status: "error",
        messages: [`Program "${programRaw}" does not match any existing program.`],
        raw: values,
        resolved: null,
      };
    }

    if (degreeLevelRaw) {
      const importedLevel = parseImportedDegreeLevel(degreeLevelRaw);
      if (importedLevel && importedLevel !== programMatch.match.degree_level) {
        messages.push(
          `Program "${programMatch.match.name}" is "${programMatch.match.degree_level}", but the import's Degree Level says "${degreeLevelRaw}". The program's own degree level is authoritative; not overridden.`
        );
        status = "warning";
      }
    }

    let admissionYear = currentYear;
    if (admissionYearRaw) {
      const parsed = Number.parseInt(admissionYearRaw, 10);
      if (Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2100) {
        admissionYear = parsed;
      } else {
        messages.push(`Admission Year "${admissionYearRaw}" is invalid — defaulting to ${currentYear}.`);
        status = "warning";
      }
    } else {
      messages.push(`Admission Year not provided — defaulting to ${currentYear}. Correct it manually afterward if this is historical data.`);
      status = "warning";
    }

    return {
      rowNumber,
      status,
      messages: messages.length > 0 ? messages : ["Ready to create."],
      raw: values,
      resolved: {
        action: "create",
        input: {
          student_number: studentId,
          name,
          email,
          program_id: programMatch.match.id,
          admission_year: admissionYear,
          specialization_id: null,
          phd_entry_basis: null,
          status: "active",
        },
      },
    };
  });

  return {
    type: "students",
    rows,
    validCount: rows.filter((r) => r.status === "valid").length,
    warningCount: rows.filter((r) => r.status === "warning").length,
    errorCount: rows.filter((r) => r.status === "error").length,
  };
}

export async function commitStudentImportRows(rows: ImportRowResult<StudentResolved>[]): Promise<ImportOutcome> {
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
    const { error } = await createStudent(row.resolved.input);
    if (error) {
      outcome.errors.push({ rowNumber: row.rowNumber, message: error.message });
      outcome.skipped++;
    } else {
      outcome.created++;
    }
  }

  return outcome;
}
