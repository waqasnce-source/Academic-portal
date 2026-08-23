"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/dal";
import { parseSpreadsheet } from "@/lib/management/import/parse";
import type { ImportType, ImportPreview, ImportOutcome, ImportRowResult, ExpectedSemester } from "@/lib/management/import/types";
import { validateCourseImportRows, commitCourseImportRows, type CourseResolved } from "@/lib/management/import/courses-import";
import { validateOfferingImportRows, commitOfferingImportRows, type OfferingResolved } from "@/lib/management/import/offerings-import";
import { validateStudentImportRows, commitStudentImportRows, type StudentResolved } from "@/lib/management/import/students-import";
import { validateEnrollmentImportRows, commitEnrollmentImportRows, type EnrollmentResolved } from "@/lib/management/import/enrollments-import";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;

export async function validateImportAction(
  type: ImportType,
  formData: FormData,
  expectedSemester?: ExpectedSemester
): Promise<ImportPreview<unknown> | { error: string }> {
  await requireRole("management");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "File is too large (max 5 MB)." };
  }

  let parsed;
  try {
    parsed = await parseSpreadsheet(file);
  } catch {
    return { error: "Could not read this file. Make sure it's a valid .xlsx or .csv file matching the template." };
  }

  if (parsed.rows.length === 0) {
    return { error: "No data rows were found in this file." };
  }
  if (parsed.rows.length > MAX_ROWS) {
    return { error: `This file has ${parsed.rows.length} rows — the limit is ${MAX_ROWS} per import. Split it into smaller files.` };
  }

  switch (type) {
    case "courses":
      return validateCourseImportRows(parsed.rows);
    case "offerings":
      return validateOfferingImportRows(parsed.rows, expectedSemester);
    case "students":
      return validateStudentImportRows(parsed.rows);
    case "enrollments":
      return validateEnrollmentImportRows(parsed.rows, expectedSemester);
  }
}

/**
 * Operates on the exact rows the client received from validateImportAction
 * — the file is never re-uploaded/re-parsed here, so the commit step
 * writes precisely what the user reviewed and confirmed, with no risk of
 * re-matching against data that changed in between. Row-level atomicity
 * (each row either fully succeeds or is reported as an error) rather than
 * one whole-batch database transaction — the four entity types have no
 * cross-row dependencies within a single import, so a failure on one row
 * never needs to unwind another; see the bulk-import report for why this
 * was chosen over adding a Postgres transaction function.
 */
export async function confirmImportAction(type: ImportType, rows: ImportRowResult<unknown>[]): Promise<ImportOutcome> {
  await requireRole("management");

  const committable = rows.filter((r) => r.resolved !== null);

  let outcome: ImportOutcome;
  switch (type) {
    case "courses":
      outcome = await commitCourseImportRows(committable as ImportRowResult<CourseResolved>[]);
      revalidatePath("/management/courses");
      break;
    case "offerings":
      outcome = await commitOfferingImportRows(committable as ImportRowResult<OfferingResolved>[]);
      revalidatePath("/management/course-offerings");
      revalidatePath("/management/academic-sessions");
      revalidatePath("/management/semesters/[id]", "layout");
      break;
    case "students":
      outcome = await commitStudentImportRows(committable as ImportRowResult<StudentResolved>[]);
      revalidatePath("/management/students");
      break;
    case "enrollments":
      outcome = await commitEnrollmentImportRows(committable as ImportRowResult<EnrollmentResolved>[]);
      revalidatePath("/management/enrollments");
      revalidatePath("/management/course-offerings");
      revalidatePath("/management/academic-sessions");
      revalidatePath("/management/semesters/[id]", "layout");
      break;
  }

  outcome.skipped += rows.length - committable.length;
  return outcome;
}
