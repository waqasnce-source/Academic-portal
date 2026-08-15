"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  STUDENT_STATUSES,
  PHD_ENTRY_BASIS_VALUES,
  createStudent,
  updateStudent,
  setStudentStatus,
  type StudentStatus,
  type PhdEntryBasisValue,
} from "@/lib/management/students";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  students_student_number_key: "A student with this number already exists.",
  students_program_id_fkey: "Selected program could not be found.",
  students_specialization_id_fkey: "Selected specialization could not be found.",
  students_admission_year_check: "Admission year must be between 2000 and 2100.",
  students_status_check: "Invalid status value.",
  students_phd_entry_basis_check: "Entry basis must be MS/MPhil/LLM or BS/Master.",
};

export interface StudentFormState {
  error?: string;
}

interface ParsedStudentInput {
  student_number: string;
  name: string;
  email: string | null;
  program_id: string;
  admission_year: number;
  specialization_id: string | null;
  phd_entry_basis: PhdEntryBasisValue | null;
  status: StudentStatus;
}

function parseStudentInput(formData: FormData): ParsedStudentInput | { error: string } {
  const studentNumber = String(formData.get("student_number") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rawEmail = String(formData.get("email") ?? "").trim();
  const programId = String(formData.get("program_id") ?? "").trim();
  const rawAdmissionYear = String(formData.get("admission_year") ?? "").trim();
  const rawSpecializationId = String(formData.get("specialization_id") ?? "").trim();
  const rawPhdEntryBasis = String(formData.get("phd_entry_basis") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "").trim();

  if (!studentNumber) return { error: "Student number is required." };
  if (studentNumber.length > 50) return { error: "Student number must be 50 characters or fewer." };
  if (!name) return { error: "Name is required." };
  if (name.length > 200) return { error: "Name must be 200 characters or fewer." };
  if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) return { error: "Email is not valid." };
  if (!UUID_RE.test(programId)) return { error: "Please select a program." };

  const admissionYear = Number(rawAdmissionYear);
  if (!Number.isFinite(admissionYear) || admissionYear < 2000 || admissionYear > 2100) {
    return { error: "Admission year must be between 2000 and 2100." };
  }

  if (rawSpecializationId && !UUID_RE.test(rawSpecializationId)) return { error: "Invalid specialization." };

  if (rawPhdEntryBasis && !(PHD_ENTRY_BASIS_VALUES as readonly string[]).includes(rawPhdEntryBasis)) {
    return { error: "Entry basis must be MS/MPhil/LLM or BS/Master." };
  }

  if (!(STUDENT_STATUSES as readonly string[]).includes(rawStatus)) {
    return { error: "Invalid status value." };
  }

  return {
    student_number: studentNumber,
    name,
    email: rawEmail || null,
    program_id: programId,
    admission_year: Math.round(admissionYear),
    specialization_id: rawSpecializationId || null,
    phd_entry_basis: (rawPhdEntryBasis || null) as PhdEntryBasisValue | null,
    status: rawStatus as StudentStatus,
  };
}

export async function createStudentAction(
  _prevState: StudentFormState | undefined,
  formData: FormData
): Promise<StudentFormState> {
  await requireRole("management");

  const parsed = parseStudentInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await createStudent(parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/students");
  redirect("/management/students");
}

export async function updateStudentAction(
  id: string,
  _prevState: StudentFormState | undefined,
  formData: FormData
): Promise<StudentFormState> {
  await requireRole("management");

  if (!UUID_RE.test(id)) return { error: "Invalid student." };

  const parsed = parseStudentInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await updateStudent(id, parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/students");
  redirect("/management/students");
}

export async function toggleStudentStatusAction(id: string, nextStatus: StudentStatus) {
  await requireRole("management");
  if (!UUID_RE.test(id)) return;
  if (!(STUDENT_STATUSES as readonly string[]).includes(nextStatus)) return;

  await setStudentStatus(id, nextStatus);
  revalidatePath("/management/students");
}
