import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createCourseOffering, assignFacultyToOffering, type CourseOfferingInput } from "@/lib/management/course-offerings";
import { OFFERING_STATUSES, type OfferingStatus, type DegreeLevel } from "@/lib/management/status-enums";
import { courseDegreeLevel } from "@/lib/management/academic-sessions";
import type { ImportPreview, ImportRowResult, ImportOutcome, RowStatus, ExpectedSemester } from "./types";
import { matchFaculty, matchCourseCode, matchSemester, normalizeLoose, normalizeAcademicYear } from "./matchers";

/** Default section for every imported offering — the import format has no Section column (see the task's own column spec), matching the create-offering form's own "A" default for a single, unsectioned offering. */
const DEFAULT_SECTION = "A";

export type OfferingResolved =
  | { action: "create"; input: CourseOfferingInput; facultyIds: string[] }
  | { action: "match"; existingId: string };

interface ReferenceData {
  semesters: { id: string; academic_year: string; name: string; status: string }[];
  courses: {
    id: string;
    code: string;
    program_courses: { program: { degree_level: DegreeLevel } | null }[] | null;
  }[];
  faculty: { id: string; name: string }[];
  offerings: { id: string; course_id: string; semester_id: string; section: string }[];
}

async function loadReferenceData(): Promise<ReferenceData> {
  const supabase = await createClient();
  const [semestersRes, coursesRes, facultyRes, offeringsRes] = await Promise.all([
    supabase.from("semesters").select("id, academic_year, name, status"),
    supabase.from("courses").select("id, code, program_courses ( program:programs ( degree_level ) )"),
    supabase.from("faculty").select("id, name, profile:profiles(full_name)"),
    supabase.from("course_offerings").select("id, course_id, semester_id, section"),
  ]);

  const faculty = ((facultyRes.data ?? []) as unknown as { id: string; name: string; profile: { full_name: string } | null }[]).map(
    (f) => ({ id: f.id, name: f.profile?.full_name ?? f.name })
  );

  return {
    semesters: semestersRes.data ?? [],
    courses: (coursesRes.data ?? []) as unknown as ReferenceData["courses"],
    faculty,
    offerings: offeringsRes.data ?? [],
  };
}

function defaultStatusForSemester(semesterStatus: string): OfferingStatus {
  if (semesterStatus === "completed") return "closed";
  if (semesterStatus === "ongoing") return "open";
  return "planned";
}

function parseImportedDegreeLevel(raw: string): DegreeLevel | null {
  const key = normalizeLoose(raw).replace(/[.\s/-]/g, "");
  if (!key) return null;
  if (["ms", "mphil", "msmphil", "masters", "master"].includes(key)) return "master";
  if (["phd", "doctorate", "doctoral"].includes(key)) return "phd";
  return null;
}

export async function validateOfferingImportRows(
  rawRows: { rowNumber: number; values: Record<string, string> }[],
  expectedSemester?: ExpectedSemester
): Promise<ImportPreview<OfferingResolved>> {
  const ref = await loadReferenceData();
  const seenInFile = new Map<string, number>();

  const rows: ImportRowResult<OfferingResolved>[] = rawRows.map(({ rowNumber, values }) => {
    const messages: string[] = [];
    let status: RowStatus = "valid";

    const academicYear = (values["Academic Year"] ?? "").trim();
    const semesterName = (values["Semester"] ?? "").trim();
    const courseCode = (values["Course Code"] ?? "").trim();
    const facultyRaw = (values["Faculty"] ?? "").trim();
    const statusRaw = (values["Offering Status"] ?? "").trim();
    const degreeLevelRaw = (values["Degree Level"] ?? "").trim();

    if (!academicYear) return { rowNumber, status: "error", messages: ["Academic Year is missing."], raw: values, resolved: null };
    if (!semesterName) return { rowNumber, status: "error", messages: ["Semester is missing."], raw: values, resolved: null };
    if (!courseCode) return { rowNumber, status: "error", messages: ["Course Code is missing."], raw: values, resolved: null };
    if (!facultyRaw) return { rowNumber, status: "error", messages: ["Faculty is missing."], raw: values, resolved: null };

    const semesterMatch = matchSemester(academicYear, semesterName, ref.semesters);
    if (semesterMatch.ambiguous || !semesterMatch.match) {
      return {
        rowNumber,
        status: "error",
        messages: [
          `Semester "${semesterName} ${academicYear}" does not exist. Create it first via Semester Management, then re-import.`,
        ],
        raw: values,
        resolved: null,
      };
    }
    const semester = semesterMatch.match;

    if (
      expectedSemester &&
      (normalizeAcademicYear(semester.academic_year) !== normalizeAcademicYear(expectedSemester.academicYear) ||
        normalizeLoose(semester.name) !== normalizeLoose(expectedSemester.name))
    ) {
      messages.push(
        `This row targets ${semester.name} ${semester.academic_year}, not ${expectedSemester.name} ${expectedSemester.academicYear} (the semester this import was opened from). Imported as written — check this is intentional.`
      );
      status = "warning";
    }

    const course = matchCourseCode(courseCode, ref.courses);
    if (!course) {
      return {
        rowNumber,
        status: "error",
        messages: [`Course "${courseCode}" was not found in the catalogue. Add it via Course Catalogue (or a Course Catalogue import) first.`],
        raw: values,
        resolved: null,
      };
    }

    let offeringStatus: OfferingStatus = defaultStatusForSemester(semester.status);
    if (statusRaw) {
      const normalized = statusRaw.toLowerCase();
      if ((OFFERING_STATUSES as readonly string[]).includes(normalized)) {
        offeringStatus = normalized as OfferingStatus;
      } else {
        messages.push(`Offering Status "${statusRaw}" is not recognized — defaulting to "${offeringStatus}".`);
        status = "warning";
      }
    }

    // Faculty: semicolon-separated list; each name resolved independently.
    // Ambiguous (multiple safe candidates) and no-match are reported
    // distinctly — they call for different manual follow-up (pick the
    // right person vs. confirm the faculty record exists at all).
    const facultyNames = facultyRaw.split(";").map((n) => n.trim()).filter(Boolean);
    const resolvedFacultyIds: string[] = [];
    const ambiguousNames: string[] = [];
    const noMatchNames: string[] = [];
    for (const name of facultyNames) {
      const m = matchFaculty(name, ref.faculty);
      if (m.match) resolvedFacultyIds.push(m.match.id);
      else if (m.ambiguous) ambiguousNames.push(name);
      else noMatchNames.push(name);
    }
    if (ambiguousNames.length > 0) {
      messages.push(
        `Faculty name matches multiple existing faculty members (not auto-assigned, needs manual resolution): ${ambiguousNames.join(", ")}.`
      );
      status = "warning";
    }
    if (noMatchNames.length > 0) {
      messages.push(
        `Faculty not found (not created automatically): ${noMatchNames.join(", ")}. Assign manually on the offering afterward.`
      );
      status = "warning";
    }

    if (degreeLevelRaw) {
      const importedLevel = parseImportedDegreeLevel(degreeLevelRaw);
      if (importedLevel) {
        const structural = courseDegreeLevel({ code: course.code, program_courses: course.program_courses });
        if (structural.level && structural.level !== importedLevel) {
          messages.push(
            `Course ${course.code} is structurally classified as "${structural.level === "phd" ? "Ph.D." : "MS/M.Phil."}", but the import says "${degreeLevelRaw}". Not overridden.`
          );
          status = "warning";
        }
      }
    }

    const fileKey = `${semester.id}::${course.id}::${DEFAULT_SECTION}`;
    const seenRow = seenInFile.get(fileKey);
    if (seenRow) {
      return {
        rowNumber,
        status: "warning",
        messages: [`Duplicate of row ${seenRow} in this file (same course + semester) — will not be imported again.`],
        raw: values,
        resolved: { action: "match", existingId: "" },
      };
    }
    seenInFile.set(fileKey, rowNumber);

    const existing = ref.offerings.find(
      (o) => o.course_id === course.id && o.semester_id === semester.id && o.section === DEFAULT_SECTION
    );
    if (existing) {
      messages.push(`This course is already offered in ${semester.name} ${semester.academic_year} — matched, no changes made.`);
      return { rowNumber, status, messages, raw: values, resolved: { action: "match", existingId: existing.id } };
    }

    return {
      rowNumber,
      status,
      messages: messages.length > 0 ? messages : ["Ready to create."],
      raw: values,
      resolved: {
        action: "create",
        input: { course_id: course.id, semester_id: semester.id, section: DEFAULT_SECTION, capacity: null, status: offeringStatus },
        facultyIds: resolvedFacultyIds,
      },
    };
  });

  return {
    type: "offerings",
    rows,
    validCount: rows.filter((r) => r.status === "valid").length,
    warningCount: rows.filter((r) => r.status === "warning").length,
    errorCount: rows.filter((r) => r.status === "error").length,
  };
}

export async function commitOfferingImportRows(rows: ImportRowResult<OfferingResolved>[]): Promise<ImportOutcome> {
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
    const { error, data } = await createCourseOffering(row.resolved.input);
    if (error || !data) {
      outcome.errors.push({ rowNumber: row.rowNumber, message: error?.message ?? "Could not create offering." });
      outcome.skipped++;
      continue;
    }
    outcome.created++;
    for (const [i, facultyId] of row.resolved.facultyIds.entries()) {
      const role = i === 0 ? "primary" : "co_instructor";
      const { error: facultyError } = await assignFacultyToOffering(data.id, facultyId, role);
      if (facultyError) {
        outcome.errors.push({ rowNumber: row.rowNumber, message: `Offering created, but could not assign faculty: ${facultyError.message}` });
      }
    }
  }

  return outcome;
}
