import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  STUDENT_STATUSES,
  type StudentStatus,
  PHD_ENTRY_BASIS_VALUES,
  type PhdEntryBasisValue,
} from "./status-enums";

export { STUDENT_STATUSES, type StudentStatus, PHD_ENTRY_BASIS_VALUES, type PhdEntryBasisValue };

export const STUDENTS_PAGE_SIZE = 25;

export interface StudentRow {
  id: string;
  student_number: string;
  name: string;
  email: string | null;
  admission_year: number;
  status: StudentStatus;
  created_at: string;
  /**
   * Nullable as of the Phase 6 students.profile_id relaxation — a student
   * academic record can now exist before any Supabase Auth account is
   * provisioned. `name`/`email` above are the authoritative identity
   * fields when this is null (same precedence convention as faculty).
   */
  profile: {
    id: string;
    full_name: string;
    email: string;
    status: "active" | "inactive" | "suspended";
  } | null;
  program: {
    id: string;
    code: string;
    name: string;
    degree_level: "diploma" | "bachelor" | "master" | "phd";
    department: {
      id: string;
      code: string;
      name: string;
    };
  };
  specialization: { id: string; name: string } | null;
}

export interface StudentFilters {
  q: string;
  studentNumber: string;
  status: StudentStatus | "";
  departmentId: string;
  programId: string;
  page: number;
}

export interface StudentsResult {
  data: StudentRow[];
  count: number;
  /** The page actually served — clamped to a valid range, see getStudents(). */
  page: number;
  error: string | null;
}

export interface StudentFilterOptions {
  departments: { id: string; name: string }[];
  programs: { id: string; name: string; department_id: string }[];
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Validates and normalizes raw URL search params into typed filters.
 * Anything that doesn't match a known-good shape (an unrecognized status,
 * a malformed UUID, a non-numeric page) is dropped rather than passed
 * through to the query — this is "handle invalid requests" (bad input is
 * ignored, not trusted), not a new business rule.
 */
export function parseStudentFilters(
  searchParams: RawSearchParams
): StudentFilters {
  const q = firstValue(searchParams.q).trim().slice(0, 200);
  const studentNumber = firstValue(searchParams.student_number)
    .trim()
    .slice(0, 50);

  const rawStatus = firstValue(searchParams.status).trim();
  const status = (STUDENT_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as StudentStatus)
    : "";

  const rawDepartment = firstValue(searchParams.department).trim();
  const departmentId = UUID_RE.test(rawDepartment) ? rawDepartment : "";

  const rawProgram = firstValue(searchParams.program).trim();
  const programId = UUID_RE.test(rawProgram) ? rawProgram : "";

  const rawPage = Number.parseInt(firstValue(searchParams.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return { q, studentNumber, status, departmentId, programId, page };
}

export function hasActiveStudentFilters(filters: StudentFilters): boolean {
  return Boolean(
    filters.q ||
      filters.studentNumber ||
      filters.status ||
      filters.departmentId ||
      filters.programId
  );
}

export function buildStudentsHref(
  filters: StudentFilters,
  page: number
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.studentNumber) params.set("student_number", filters.studentNumber);
  if (filters.status) params.set("status", filters.status);
  if (filters.departmentId) params.set("department", filters.departmentId);
  if (filters.programId) params.set("program", filters.programId);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/students?${qs}` : "/management/students";
}

/**
 * profile:profiles is a plain (not `!inner`) embed as of Phase 6: since
 * students.profile_id is now nullable, an `!inner` join would silently
 * drop every profile-less student from every list/count — exactly the
 * students this phase exists to let Management create. program_id
 * remains NOT NULL, so `program:programs!inner` is unaffected and still
 * safe to keep.
 */
const STUDENT_SELECT = `
  id,
  student_number,
  name,
  email,
  admission_year,
  status,
  created_at,
  profile:profiles ( id, full_name, email, status ),
  program:programs!inner (
    id, code, name, degree_level,
    department:departments!inner ( id, code, name )
  ),
  specialization:specializations ( id, name )
`;

/**
 * The filter-application logic below is duplicated across the count query
 * and the data query rather than factored into a shared helper: the two
 * query builders are different generic instantiations (count/head vs.
 * full select), and this project has no generated Database types to type
 * a shared builder against cleanly.
 */

/**
 * Reads through the normal server-side client (publishable key), so
 * `students_select_authenticated` RLS is the actual enforcement — a
 * management caller sees every row via `has_role('management')`; this
 * function does not itself restrict rows beyond the filters passed in.
 *
 * Counts first (head-only, no `.range()`) and clamps the requested page to
 * the real last page before ever issuing the ranged data query. Without
 * this, a huge/stale `page` value (e.g. an old bookmark after most
 * students were removed) produces an out-of-bounds `.range()` that
 * PostgREST rejects outright — confirmed against the live project, this
 * previously surfaced as a raw "Could not load student records" error
 * instead of just clamping to the last valid page.
 */
export async function getStudents(
  filters: StudentFilters
): Promise<StudentsResult> {
  const supabase = await createClient();

  let countQuery = supabase
    .from("students")
    .select("id, program:programs!inner(department_id)", {
      count: "exact",
      head: true,
    });

  if (filters.status) countQuery = countQuery.eq("status", filters.status);
  if (filters.studentNumber) {
    countQuery = countQuery.ilike("student_number", `%${filters.studentNumber}%`);
  }
  if (filters.programId) countQuery = countQuery.eq("program_id", filters.programId);
  if (filters.departmentId) {
    countQuery = countQuery.eq("program.department_id", filters.departmentId);
  }
  if (filters.q) {
    const escaped = filters.q.replace(/[(),]/g, "");
    countQuery = countQuery.or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getStudents count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load student records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / STUDENTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("students").select(STUDENT_SELECT);

  if (filters.status) dataQuery = dataQuery.eq("status", filters.status);
  if (filters.studentNumber) {
    dataQuery = dataQuery.ilike("student_number", `%${filters.studentNumber}%`);
  }
  if (filters.programId) dataQuery = dataQuery.eq("program_id", filters.programId);
  if (filters.departmentId) {
    dataQuery = dataQuery.eq("program.department_id", filters.departmentId);
  }
  if (filters.q) {
    // name/email are top-level students columns as of Phase 6 (previously
    // this searched the embedded profiles table only, which would miss
    // every profile-less student now that profile_id is nullable).
    // student_number has its own dedicated filter above instead of being
    // folded into this box.
    const escaped = filters.q.replace(/[(),]/g, "");
    dataQuery = dataQuery.or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  const from = (safePage - 1) * STUDENTS_PAGE_SIZE;
  const to = from + STUDENTS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("student_number", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("getStudents data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load student records." };
  }

  return {
    data: (data ?? []) as unknown as StudentRow[],
    count: totalCount,
    page: safePage,
    error: null,
  };
}

/**
 * Options for the department/program filter dropdowns. Both tables have a
 * `using (true)` select policy for any authenticated user, so this is a
 * plain catalog read, same as the rest of the app.
 */
export async function getStudentFilterOptions(): Promise<StudentFilterOptions> {
  const supabase = await createClient();

  const [departmentsRes, programsRes] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("programs")
      .select("id, name, department_id")
      .eq("status", "active")
      .order("name"),
  ]);

  if (departmentsRes.error) {
    console.error("getStudentFilterOptions departments failed:", departmentsRes.error);
  }
  if (programsRes.error) {
    console.error("getStudentFilterOptions programs failed:", programsRes.error);
  }

  return {
    departments: departmentsRes.data ?? [],
    programs: programsRes.data ?? [],
  };
}

export interface StudentProgramOption {
  id: string;
  name: string;
  degree_level: "diploma" | "bachelor" | "master" | "phd";
  department_id: string;
}

export interface StudentSpecializationOption {
  id: string;
  name: string;
  department_id: string;
}

/** Options for the create/edit form's program and specialization selects. */
export async function getStudentFormOptions(): Promise<{
  programs: StudentProgramOption[];
  specializations: StudentSpecializationOption[];
}> {
  const supabase = await createClient();

  const [programsRes, specializationsRes] = await Promise.all([
    supabase
      .from("programs")
      .select("id, name, degree_level, department_id")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("specializations")
      .select("id, name, department_id")
      .eq("is_active", true)
      .order("name"),
  ]);

  if (programsRes.error) console.error("getStudentFormOptions programs failed:", programsRes.error);
  if (specializationsRes.error) console.error("getStudentFormOptions specializations failed:", specializationsRes.error);

  return {
    programs: (programsRes.data ?? []) as StudentProgramOption[],
    specializations: (specializationsRes.data ?? []) as StudentSpecializationOption[],
  };
}

export interface StudentDetail {
  id: string;
  student_number: string;
  name: string;
  email: string | null;
  program_id: string;
  admission_year: number;
  specialization_id: string | null;
  phd_entry_basis: "ms_mphil_llm" | "bs_master" | null;
  status: StudentStatus;
  profile_id: string | null;
}

export async function getStudentById(id: string): Promise<StudentDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, student_number, name, email, program_id, admission_year, specialization_id, phd_entry_basis, status, profile_id")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as StudentDetail;
}

export interface StudentInput {
  student_number: string;
  name: string;
  email: string | null;
  program_id: string;
  admission_year: number;
  specialization_id: string | null;
  phd_entry_basis: "ms_mphil_llm" | "bs_master" | null;
  status: StudentStatus;
}

/**
 * Raw mutation helpers — return the Supabase response as-is so the
 * calling Server Action can map `error` through toUserMessage(). RLS
 * enforcement is `students_insert_management` / `students_update_management`
 * (`has_role('management')`). profile_id is never set here — linking an
 * account is a separate, not-yet-built action (see Phase 6 report).
 */
export async function createStudent(input: StudentInput) {
  const supabase = await createClient();
  return supabase.from("students").insert(input).select("id").single();
}

export async function updateStudent(id: string, input: StudentInput) {
  const supabase = await createClient();
  return supabase.from("students").update(input).eq("id", id).select("id").single();
}

export async function setStudentStatus(id: string, status: StudentStatus) {
  const supabase = await createClient();
  return supabase.from("students").update({ status }).eq("id", id);
}
