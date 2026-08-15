/**
 * Status/enum constants shared between server-only data-access modules
 * (lib/management, which import "server-only") and the Client Component
 * form modules under app/management. This file intentionally has NO
 * "server-only" import so Client Components can import these plain const
 * arrays/types without pulling a server-only module into the browser
 * bundle. Each server module re-exports its slice of these for backward
 * compatibility with existing server-side imports.
 */

/** Mirrors departments.status's CHECK constraint exactly. */
export const DEPARTMENT_STATUSES = ["active", "inactive"] as const;
export type DepartmentStatus = (typeof DEPARTMENT_STATUSES)[number];

/** Mirrors programs.status's CHECK constraint exactly. */
export const PROGRAM_STATUSES = ["active", "inactive"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

/** Mirrors programs.degree_level's CHECK constraint exactly. */
export const DEGREE_LEVELS = ["diploma", "bachelor", "master", "phd"] as const;
export type DegreeLevel = (typeof DEGREE_LEVELS)[number];

/** Mirrors courses.status's CHECK constraint exactly. */
export const COURSE_STATUSES = ["active", "inactive"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

/** Mirrors semesters.status's CHECK constraint exactly. */
export const SEMESTER_STATUSES = ["upcoming", "ongoing", "completed"] as const;
export type SemesterStatus = (typeof SEMESTER_STATUSES)[number];

/** Mirrors supervisor_assignments.role's CHECK constraint exactly. */
export const SUPERVISOR_ASSIGNMENT_ROLES = ["supervisor", "co_supervisor"] as const;
export type SupervisorAssignmentRole = (typeof SUPERVISOR_ASSIGNMENT_ROLES)[number];

/** Mirrors extension_applications.status's CHECK constraint exactly. */
export const EXTENSION_APPLICATION_STATUSES = ["draft", "submitted", "under_review", "approved", "rejected"] as const;
export type ExtensionApplicationStatus = (typeof EXTENSION_APPLICATION_STATUSES)[number];

/** Mirrors faculty.status's CHECK constraint exactly. */
export const FACULTY_STATUSES = ["active", "inactive"] as const;
export type FacultyStatus = (typeof FACULTY_STATUSES)[number];

/** Mirrors students.status's CHECK constraint exactly. */
export const STUDENT_STATUSES = ["active", "inactive", "graduated", "suspended", "withdrawn"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

/** Mirrors students.phd_entry_basis's CHECK constraint exactly. */
export const PHD_ENTRY_BASIS_VALUES = ["ms_mphil_llm", "bs_master"] as const;
export type PhdEntryBasisValue = (typeof PHD_ENTRY_BASIS_VALUES)[number];

/** Mirrors curriculum_requirements.requirement_category's CHECK constraint exactly. */
export const REQUIREMENT_CATEGORIES = [
  "general",
  "major",
  "elective",
  "seminar",
  "project",
  "thesis_research",
] as const;
export type RequirementCategory = (typeof REQUIREMENT_CATEGORIES)[number];

/** Mirrors grading_scale.status's CHECK constraint exactly. */
export const GRADING_SCALE_STATUSES = ["active", "inactive"] as const;
export type GradingScaleStatus = (typeof GRADING_SCALE_STATUSES)[number];

/** Mirrors course_offerings.status's CHECK constraint exactly. */
export const OFFERING_STATUSES = ["planned", "open", "closed", "cancelled"] as const;
export type OfferingStatus = (typeof OFFERING_STATUSES)[number];

/** Mirrors course_offering_faculty.role's CHECK constraint exactly. */
export const COURSE_OFFERING_FACULTY_ROLES = ["primary", "co_instructor", "lab_instructor"] as const;
export type CourseOfferingFacultyRole = (typeof COURSE_OFFERING_FACULTY_ROLES)[number];

/** Mirrors enrollments.status's CHECK constraint exactly. */
export const ENROLLMENT_STATUSES = ["active", "completed", "dropped", "failed"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

/** Mirrors attendance.status's CHECK constraint exactly. */
export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/**
 * Mirrors profiles.status's CHECK constraint exactly. This is the
 * application-level account status (whether the profile can sign in and
 * use the portal) — distinct from students.status/faculty.status (academic
 * standing/employment status) and distinct from true Supabase
 * Auth-level suspension (banning the auth.users row itself, which requires
 * the Admin API and is not available without a service-role key).
 */
export const PROFILE_STATUSES = ["active", "inactive", "suspended"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];
