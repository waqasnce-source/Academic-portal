import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createEnrollment, updateEnrollmentStatus } from "@/lib/management/enrollments";
import { ENROLLMENT_STATUSES, type EnrollmentStatus } from "@/lib/management/status-enums";
import type { ImportPreview, ImportRowResult, ImportOutcome, RowStatus, ExpectedSemester } from "./types";
import { matchSemester, matchCourseCode, normalizeLoose, normalizeAcademicYear } from "./matchers";

export type EnrollmentResolved =
  | { action: "create"; studentId: string; courseOfferingId: string; status: EnrollmentStatus }
  | { action: "match"; existingId: string };

interface ReferenceData {
  semesters: { id: string; academic_year: string; name: string }[];
  courses: { id: string; code: string }[];
  offerings: { id: string; course_id: string; semester_id: string; capacity: number | null; status: string }[];
  students: { id: string; student_number: string; email: string | null; status: string }[];
  enrollments: { id: string; student_id: string; course_offering_id: string; status: string }[];
}

async function loadReferenceData(): Promise<ReferenceData> {
  const supabase = await createClient();
  const [semestersRes, coursesRes, offeringsRes, studentsRes, enrollmentsRes] = await Promise.all([
    supabase.from("semesters").select("id, academic_year, name"),
    supabase.from("courses").select("id, code"),
    supabase.from("course_offerings").select("id, course_id, semester_id, capacity, status"),
    supabase.from("students").select("id, student_number, email, status"),
    supabase.from("enrollments").select("id, student_id, course_offering_id, status"),
  ]);
  return {
    semesters: semestersRes.data ?? [],
    courses: coursesRes.data ?? [],
    offerings: offeringsRes.data ?? [],
    students: studentsRes.data ?? [],
    enrollments: enrollmentsRes.data ?? [],
  };
}

export async function validateEnrollmentImportRows(
  rawRows: { rowNumber: number; values: Record<string, string> }[],
  expectedSemester?: ExpectedSemester
): Promise<ImportPreview<EnrollmentResolved>> {
  const ref = await loadReferenceData();
  const seenInFile = new Set<string>();
  /** Running count of newly-created 'active' rows per offering this batch, added to the offering's existing active count, to enforce capacity across the whole file (not just one row at a time). */
  const activeCountByOffering = new Map<string, number>();
  for (const e of ref.enrollments) {
    if (e.status === "active") {
      activeCountByOffering.set(e.course_offering_id, (activeCountByOffering.get(e.course_offering_id) ?? 0) + 1);
    }
  }

  const rows: ImportRowResult<EnrollmentResolved>[] = rawRows.map(({ rowNumber, values }) => {
    const messages: string[] = [];
    let status: RowStatus = "valid";

    const academicYear = (values["Academic Year"] ?? "").trim();
    const semesterName = (values["Semester"] ?? "").trim();
    const courseCode = (values["Course Code"] ?? "").trim();
    const studentId = (values["Student ID"] ?? "").trim();
    const studentEmail = (values["Student Email"] ?? "").trim();
    const enrollmentStatusRaw = (values["Enrollment Status"] ?? "").trim();

    if (!academicYear) return { rowNumber, status: "error", messages: ["Academic Year is missing."], raw: values, resolved: null };
    if (!semesterName) return { rowNumber, status: "error", messages: ["Semester is missing."], raw: values, resolved: null };
    if (!courseCode) return { rowNumber, status: "error", messages: ["Course Code is missing."], raw: values, resolved: null };
    if (!studentId && !studentEmail) {
      return { rowNumber, status: "error", messages: ["Provide either Student ID or Student Email."], raw: values, resolved: null };
    }

    const semesterMatch = matchSemester(academicYear, semesterName, ref.semesters);
    if (semesterMatch.ambiguous || !semesterMatch.match) {
      return { rowNumber, status: "error", messages: [`Semester "${semesterName} ${academicYear}" does not exist.`], raw: values, resolved: null };
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
      return { rowNumber, status: "error", messages: [`Course "${courseCode}" was not found in the catalogue.`], raw: values, resolved: null };
    }

    const matchingOfferings = ref.offerings.filter((o) => o.course_id === course.id && o.semester_id === semester.id);
    if (matchingOfferings.length === 0) {
      return {
        rowNumber,
        status: "error",
        messages: [`No offering of ${course.code} exists in ${semester.name} ${semester.academic_year}. Create the offering first.`],
        raw: values,
        resolved: null,
      };
    }
    if (matchingOfferings.length > 1) {
      return {
        rowNumber,
        status: "error",
        messages: [`${course.code} has multiple sections in ${semester.name} ${semester.academic_year} — cannot resolve which one without a Section column.`],
        raw: values,
        resolved: null,
      };
    }
    const offering = matchingOfferings[0];

    // Strong identifier (student_number) preferred over email, per the task's stated priority.
    let student = studentId ? ref.students.find((s) => normalizeLoose(s.student_number) === normalizeLoose(studentId)) : undefined;
    if (!student && studentEmail) {
      student = ref.students.find((s) => s.email && normalizeLoose(s.email) === normalizeLoose(studentEmail));
    }
    if (!student) {
      return {
        rowNumber,
        status: "error",
        messages: [`Student not found (${studentId ? `ID "${studentId}"` : `email "${studentEmail}"`}). Import or create the student first.`],
        raw: values,
        resolved: null,
      };
    }
    if (student.status !== "active") {
      return {
        rowNumber,
        status: "error",
        messages: [`Student's status is "${student.status}" — only active students can be enrolled.`],
        raw: values,
        resolved: null,
      };
    }

    let enrollmentStatus: EnrollmentStatus = "active";
    if (enrollmentStatusRaw) {
      const normalized = enrollmentStatusRaw.toLowerCase();
      if ((ENROLLMENT_STATUSES as readonly string[]).includes(normalized)) {
        enrollmentStatus = normalized as EnrollmentStatus;
      } else {
        messages.push(`Enrollment Status "${enrollmentStatusRaw}" is not recognized — defaulting to "active".`);
        status = "warning";
      }
    }

    const fileKey = `${student.id}::${offering.id}`;
    if (seenInFile.has(fileKey)) {
      return {
        rowNumber,
        status: "warning",
        messages: [`Duplicate of an earlier row in this file (same student + course offering) — will not be imported again.`],
        raw: values,
        resolved: { action: "match", existingId: "" },
      };
    }
    seenInFile.add(fileKey);

    const existing = ref.enrollments.find((e) => e.student_id === student!.id && e.course_offering_id === offering.id);
    if (existing) {
      if (existing.status !== enrollmentStatus) {
        messages.push(
          `Student is already enrolled in this offering with status "${existing.status}" — import says "${enrollmentStatus}". Not changed; use the enrollment's status form to update it if needed.`
        );
        status = "warning";
      } else {
        messages.push("Student is already enrolled in this offering with this status — matched, no changes made.");
      }
      return { rowNumber, status, messages, raw: values, resolved: { action: "match", existingId: existing.id } };
    }

    if (offering.status === "cancelled") {
      return { rowNumber, status: "error", messages: [`This offering has been cancelled and cannot accept new enrollments.`], raw: values, resolved: null };
    }

    if (enrollmentStatus === "active" && offering.capacity != null) {
      const projectedCount = activeCountByOffering.get(offering.id) ?? 0;
      if (projectedCount >= offering.capacity) {
        return {
          rowNumber,
          status: "error",
          messages: [`This offering is at capacity (${offering.capacity}) once earlier rows in this file are counted.`],
          raw: values,
          resolved: null,
        };
      }
      activeCountByOffering.set(offering.id, projectedCount + 1);
    }

    return {
      rowNumber,
      status,
      messages: messages.length > 0 ? messages : ["Ready to enroll."],
      raw: values,
      resolved: { action: "create", studentId: student.id, courseOfferingId: offering.id, status: enrollmentStatus },
    };
  });

  return {
    type: "enrollments",
    rows,
    validCount: rows.filter((r) => r.status === "valid").length,
    warningCount: rows.filter((r) => r.status === "warning").length,
    errorCount: rows.filter((r) => r.status === "error").length,
  };
}

export async function commitEnrollmentImportRows(rows: ImportRowResult<EnrollmentResolved>[]): Promise<ImportOutcome> {
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
    const { error, data } = await createEnrollment({
      student_id: row.resolved.studentId,
      course_offering_id: row.resolved.courseOfferingId,
    });
    if (error || !data) {
      outcome.errors.push({ rowNumber: row.rowNumber, message: error?.message ?? "Could not create enrollment." });
      outcome.skipped++;
      continue;
    }
    outcome.created++;
    // createEnrollment always inserts as 'active' (the DB default); a
    // historical import row asking for a different status needs a
    // follow-up status update rather than a status column on insert.
    if (row.resolved.status !== "active") {
      const { error: statusError } = await updateEnrollmentStatus(data.id, row.resolved.status);
      if (statusError) {
        outcome.errors.push({ rowNumber: row.rowNumber, message: `Enrolled, but could not set status to "${row.resolved.status}": ${statusError.message}` });
      }
    }
  }

  return outcome;
}
