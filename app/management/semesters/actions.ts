"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  SEMESTER_STATUSES,
  createSemester,
  updateSemester,
  type SemesterStatus,
} from "@/lib/management/semesters";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

/**
 * Constraint names per supabase/migrations/20260812000000_initial_academic_portal_schema.sql:167-177 —
 * semesters has no single-column unique constraints; only the composite
 * (academic_year, name) pair, and a table CHECK on end_date > start_date.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  semesters_academic_year_name_key: "A semester with this academic year and name already exists.",
  semesters_end_date_check: "End date must be after the start date.",
  semesters_status_check: "Status must be Upcoming, Ongoing, or Completed.",
};

export interface SemesterFormState {
  error?: string;
}

interface ParsedSemesterInput {
  academic_year: string;
  name: string;
  start_date: string;
  end_date: string;
  status: SemesterStatus;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseSemesterInput(formData: FormData): ParsedSemesterInput | { error: string } {
  const academicYear = String(formData.get("academic_year") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "").trim();

  if (!academicYear) return { error: "Academic year is required." };
  if (academicYear.length > 50) return { error: "Academic year must be 50 characters or fewer." };
  if (!name) return { error: "Name is required." };
  if (name.length > 200) return { error: "Name must be 200 characters or fewer." };

  if (!DATE_RE.test(startDate) || Number.isNaN(Date.parse(startDate))) {
    return { error: "Start date must be a valid date." };
  }
  if (!DATE_RE.test(endDate) || Number.isNaN(Date.parse(endDate))) {
    return { error: "End date must be a valid date." };
  }
  if (Date.parse(endDate) <= Date.parse(startDate)) {
    return { error: "End date must be after the start date." };
  }

  if (!(SEMESTER_STATUSES as readonly string[]).includes(rawStatus)) {
    return { error: "Status must be Upcoming, Ongoing, or Completed." };
  }

  return {
    academic_year: academicYear,
    name,
    start_date: startDate,
    end_date: endDate,
    status: rawStatus as SemesterStatus,
  };
}

export async function createSemesterAction(
  _prevState: SemesterFormState | undefined,
  formData: FormData
): Promise<SemesterFormState> {
  await requireRole("management");

  const parsed = parseSemesterInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await createSemester(parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/semesters");
  redirect("/management/semesters");
}

export async function updateSemesterAction(
  id: string,
  _prevState: SemesterFormState | undefined,
  formData: FormData
): Promise<SemesterFormState> {
  await requireRole("management");

  if (!UUID_RE.test(id)) return { error: "Invalid semester." };

  const parsed = parseSemesterInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await updateSemester(id, parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/semesters");
  redirect("/management/semesters");
}
