import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MilestoneDegreeLevel, PhdEntryBasis } from "./milestones";

/**
 * Bridges from the authenticated profile (profiles.id = auth.uid(), what
 * requireRole() returns) to the students/faculty row id that every
 * lib/academic/*.ts read function actually takes. Missing in Phase 3
 * because nothing there needed it yet — every Phase 3 consumer was the
 * Management UI, which already has an explicit student/faculty id from a
 * list page. Every Student/Faculty portal page needs this first.
 */
export async function getCurrentStudentId(profileId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

export async function getCurrentFacultyId(profileId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faculty")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

export interface StudentProfileSummary {
  id: string;
  student_number: string;
  admission_year: number;
  status: string;
  phd_entry_basis: PhdEntryBasis | null;
  full_name: string;
  email: string;
  program: {
    id: string;
    name: string;
    degree_level: MilestoneDegreeLevel;
    department: { id: string; name: string };
  } | null;
  specialization: { id: string; name: string } | null;
}

interface RawStudentProfileSummary {
  id: string;
  student_number: string;
  name: string;
  email: string | null;
  admission_year: number;
  status: string;
  phd_entry_basis: PhdEntryBasis | null;
  profile: { full_name: string; email: string } | null;
  program: {
    id: string;
    name: string;
    degree_level: MilestoneDegreeLevel;
    department: { id: string; name: string };
  } | null;
  specialization: { id: string; name: string } | null;
}

const STUDENT_PROFILE_SUMMARY_SELECT = `
  id,
  student_number,
  name,
  email,
  admission_year,
  status,
  phd_entry_basis,
  profile:profiles ( full_name, email ),
  program:programs ( id, name, degree_level, department:departments ( id, name ) ),
  specialization:specializations ( id, name )
`;

/**
 * Identity + program/discipline/specialization block for the dashboard
 * header. Distinct from getStudentAcademicStatus() (progress/milestones) —
 * this is "who the student is", that is "where they stand".
 */
export async function getStudentProfileSummary(studentId: string): Promise<StudentProfileSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(STUDENT_PROFILE_SUMMARY_SELECT)
    .eq("id", studentId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("getStudentProfileSummary failed:", error);
    return null;
  }

  const raw = data as unknown as RawStudentProfileSummary;
  return {
    id: raw.id,
    student_number: raw.student_number,
    admission_year: raw.admission_year,
    status: raw.status,
    phd_entry_basis: raw.phd_entry_basis,
    // profiles.full_name takes precedence once an account is linked (same
    // precedence convention documented on students.name); students.name is
    // the fallback for a student with no linked account yet.
    full_name: raw.profile?.full_name ?? raw.name,
    email: raw.profile?.email ?? raw.email ?? "",
    program: raw.program,
    specialization: raw.specialization,
  };
}

export interface FacultyProfileSummary {
  id: string;
  name: string;
  designation: string;
}

export async function getFacultyProfileSummary(facultyId: string): Promise<FacultyProfileSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faculty")
    .select("id, name, designation")
    .eq("id", facultyId)
    .maybeSingle();

  if (error || !data) return null;
  return data as FacultyProfileSummary;
}
