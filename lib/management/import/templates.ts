import "server-only";

import ExcelJS from "exceljs";
import type { ImportType } from "./types";

interface TemplateSpec {
  filename: string;
  columns: { header: string; key: string; width: number }[];
  exampleRow: Record<string, string | number>;
  instructions: string[];
}

const TEMPLATES: Record<ImportType, TemplateSpec> = {
  courses: {
    filename: "course-catalogue-template.xlsx",
    columns: [
      { header: "Course Code", key: "code", width: 16 },
      { header: "Course Title", key: "title", width: 40 },
      { header: "Discipline", key: "discipline", width: 24 },
      { header: "Credit Hours", key: "credit_hours", width: 14 },
      { header: "Degree Level", key: "degree_level", width: 14 },
      { header: "Status", key: "status", width: 12 },
    ],
    exampleRow: {
      code: "Geol.731",
      title: "Engineering Geology",
      discipline: "Geology",
      credit_hours: 3,
      degree_level: "MS/M.Phil.",
      status: "active",
    },
    instructions: [
      "Course Code, Course Title, Discipline, and Credit Hours are required.",
      "Discipline must match an existing department name (e.g. Geology, Environmental Geosciences, Geophysics, Geospatial Sciences).",
      "Degree Level and Status are optional. Degree Level is informational only for new courses — it is not stored directly; it is derived from the course's program linkage.",
      "If a course with the same Course Code already exists, the row is matched to it and no changes are made.",
    ],
  },
  offerings: {
    filename: "course-offerings-template.xlsx",
    columns: [
      { header: "Academic Year", key: "academic_year", width: 16 },
      { header: "Semester", key: "semester", width: 12 },
      { header: "Course Code", key: "course_code", width: 16 },
      { header: "Faculty", key: "faculty", width: 36 },
      { header: "Offering Status", key: "status", width: 16 },
      { header: "Degree Level", key: "degree_level", width: 14 },
    ],
    exampleRow: {
      academic_year: "2025-26",
      semester: "Fall",
      course_code: "Geol.731",
      faculty: "Dr. Waqas Ahmed",
      status: "open",
      degree_level: "MS/M.Phil.",
    },
    instructions: [
      "Academic Year, Semester, Course Code, and Faculty are required.",
      "The Academic Year + Semester must already exist — create it first via Semester Management.",
      "The Course Code must already exist in the Course Catalogue.",
      "Faculty accepts multiple names separated by a semicolon (;) for co-teaching — the first is assigned as Primary, the rest as Co-Instructor.",
      "Faculty names are matched to existing faculty records only — a name with no confident match is never auto-created; it is flagged for manual assignment.",
      "Offering Status and Degree Level are optional. If Offering Status is omitted, it defaults based on the semester's own status.",
    ],
  },
  students: {
    filename: "students-template.xlsx",
    columns: [
      { header: "Student ID", key: "student_id", width: 16 },
      { header: "Student Name", key: "name", width: 28 },
      { header: "Email", key: "email", width: 30 },
      { header: "Program", key: "program", width: 30 },
      { header: "Degree Level", key: "degree_level", width: 14 },
      { header: "Admission Year", key: "admission_year", width: 16 },
    ],
    exampleRow: {
      student_id: "MS-GEOL-2025-01",
      name: "Jane Doe",
      email: "jane.doe@example.com",
      program: "MS/M.Phil. in Geology",
      degree_level: "MS/M.Phil.",
      admission_year: 2025,
    },
    instructions: [
      "Student Name and Email are always required.",
      "Student ID and Program are required to CREATE a new student (the database requires both), but are only used to MATCH an existing student if that student already exists.",
      "Program must match an existing program's name or code.",
      "Degree Level is informational only — it comes from the matched Program and is not stored directly on the student.",
      "Admission Year is optional; if omitted, it defaults to the current year — correct it manually afterward for historical students.",
    ],
  },
  enrollments: {
    filename: "enrollments-template.xlsx",
    columns: [
      { header: "Academic Year", key: "academic_year", width: 16 },
      { header: "Semester", key: "semester", width: 12 },
      { header: "Course Code", key: "course_code", width: 16 },
      { header: "Student ID", key: "student_id", width: 18 },
      { header: "Student Email", key: "student_email", width: 30 },
      { header: "Enrollment Status", key: "status", width: 18 },
    ],
    exampleRow: {
      academic_year: "2025-26",
      semester: "Fall",
      course_code: "Geol.731",
      student_id: "MS-GEOL-2025-01",
      student_email: "",
      status: "active",
    },
    instructions: [
      "Academic Year, Semester, and Course Code are required, and must already exist (create the semester and the course offering first).",
      "Provide either Student ID or Student Email — Student ID is used first if both are given.",
      "Enrollment Status is optional and defaults to 'active'. Valid values: active, completed, failed, dropped.",
      "If the student is already enrolled in this exact course offering, the row is matched and no changes are made — it will not create a duplicate enrollment.",
    ],
  },
};

export function getTemplateSpec(type: ImportType): TemplateSpec {
  return TEMPLATES[type];
}

export async function generateTemplate(type: ImportType): Promise<{ filename: string; buffer: Buffer }> {
  const spec = TEMPLATES[type];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data");
  sheet.columns = spec.columns;
  sheet.addRow(spec.exampleRow);
  sheet.getRow(1).font = { bold: true };

  const notesSheet = workbook.addWorksheet("Instructions");
  notesSheet.getColumn(1).width = 100;
  spec.instructions.forEach((line, i) => {
    notesSheet.getCell(`A${i + 1}`).value = `• ${line}`;
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return { filename: spec.filename, buffer: Buffer.from(arrayBuffer) };
}
