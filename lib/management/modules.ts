export interface ManagementModule {
  slug: string;
  label: string;
  description: string;
}

/**
 * Mirrors the Management/Admin "Planned functional areas" list in
 * CLAUDE.md verbatim — this file is the single source for both the
 * sidebar nav and the stub pages under /management/[module], so nav
 * entries and routes can never drift apart. Each is a placeholder until
 * its own feature is explicitly requested and built.
 */
export const MANAGEMENT_MODULES: ManagementModule[] = [
  {
    slug: "academic-progress",
    label: "Academic Progress",
    description: "Institution-wide academic status computed from milestone records.",
  },
  {
    slug: "students",
    label: "Student Management",
    description: "Manage student records, program assignment, and status.",
  },
  {
    slug: "faculty",
    label: "Faculty Management",
    description: "Manage faculty records, department assignment, and status.",
  },
  {
    slug: "departments",
    label: "Department Management",
    description: "Manage academic departments.",
  },
  {
    slug: "programs",
    label: "Program Management",
    description: "Manage degree programs and their departments.",
  },
  {
    slug: "courses",
    label: "Course Management",
    description: "Manage the course catalog.",
  },
  {
    slug: "specializations",
    label: "Specializations",
    description: "Manage specializations within each discipline.",
  },
  {
    slug: "curriculum-requirements",
    label: "Curriculum Requirements",
    description: "Configure degree/specialization requirements — specific courses and category credit-hour targets.",
  },
  {
    slug: "catalogue-notes",
    label: "Data Issues",
    description: "Source-catalogue anomalies flagged for review — conflicting codes, unresolved rules, and similar.",
  },
  {
    slug: "academic-sessions",
    label: "Academic Sessions",
    description: "Session-wise view of teaching activity — session → semester → discipline → course → faculty → students.",
  },
  {
    slug: "semesters",
    label: "Semester Management",
    description: "Manage academic semesters.",
  },
  {
    slug: "course-offerings",
    label: "Course Offerings",
    description:
      "Manage course offerings and faculty assignments per semester.",
  },
  {
    slug: "bulk-import",
    label: "Bulk Import",
    description: "Import Course Catalogue, Course Offerings, Students, or Enrollments from Excel/CSV.",
  },
  {
    slug: "enrollments",
    label: "Enrollments",
    description: "Manage student enrollment in course offerings.",
  },
  {
    slug: "attendance",
    label: "Attendance",
    description: "Review attendance records.",
  },
  {
    slug: "results",
    label: "Results",
    description: "Review and publish results.",
  },
  {
    slug: "grading-scale",
    label: "Grading Scale",
    description: "Configure the institutional marks-to-grade-point scale.",
  },
  {
    slug: "supervisor-assignments",
    label: "Supervisor Assignments",
    description: "Assign and track student supervisors and co-supervisors.",
  },
  {
    slug: "milestones",
    label: "Milestone Templates",
    description: "Configure the degree-completion roadmap for MS/MPhil and PhD.",
  },
  {
    slug: "research-proposals",
    label: "GSC/ASRB Research Proposals",
    description: "Track research projects and GSC/ASRB proposal review stages.",
  },
  {
    slug: "documents",
    label: "Documents",
    description: "Review required and submitted academic documents.",
  },
  {
    slug: "extensions",
    label: "Extension Applications",
    description: "Review student extension applications.",
  },
  {
    slug: "thesis",
    label: "Thesis Records",
    description: "Track thesis submission, review, and defence records.",
  },
  {
    slug: "timetable",
    label: "Timetable",
    description: "Manage class timetables.",
  },
  {
    slug: "notices",
    label: "Notices",
    description: "Publish notices to students, faculty, or management.",
  },
  {
    slug: "notifications",
    label: "Notifications",
    description: "Review system notifications.",
  },
  {
    slug: "reports",
    label: "Reports",
    description: "Institution-wide reports.",
  },
  {
    slug: "users",
    label: "User & Role Management",
    description: "Manage user accounts and roles.",
  },
  {
    slug: "settings",
    label: "System Settings",
    description: "Configure system-wide settings.",
  },
];

export function getManagementModule(slug: string): ManagementModule | undefined {
  return MANAGEMENT_MODULES.find((m) => m.slug === slug);
}

export interface ManagementNavItem {
  slug: string;
  label: string;
}

export interface ManagementNavGroup {
  label: string;
  items: ManagementNavItem[];
}

/**
 * Grouped sidebar navigation — separate from MANAGEMENT_MODULES (which
 * stays a flat list, still used by getManagementModule()/the [module]
 * fallback route). This is presentation-only: it reorganizes the SAME
 * routes into a workflow-oriented hierarchy so a management user isn't
 * expected to already know the internal module structure.
 *
 * Deliberately minimal — 11 items, not 29. Two labels are workflow
 * concepts rather than literal route names: "Programs & Curriculum"
 * points at Programs (curriculum-requirements/specializations/departments
 * are reached contextually FROM the Programs page, not given their own
 * sidebar slot); "Research & Thesis" points at Research Proposals
 * (supervisor-assignments/thesis/extensions are reached from there and
 * from a student's own Academic Progress page, per the explicit
 * instruction that "Student -> Academic Progress -> Supervisor" should
 * replace "Sidebar -> Supervisor Assignments" as the normal path).
 *
 * Everything NOT listed here keeps its route and is still reachable —
 * see each page's own contextual links (semester hub, course detail,
 * Academic Progress detail, Programs, Results, Notices) rather than a
 * flat sidebar entry: semesters, course-offerings, enrollments,
 * bulk-import, milestones, curriculum-requirements, grading-scale,
 * supervisor-assignments, extensions, thesis, results, attendance,
 * timetable, departments, specializations, catalogue-notes, notifications.
 */
export const MANAGEMENT_NAV_GROUPS: ManagementNavGroup[] = [
  {
    label: "Academics",
    items: [{ slug: "academic-sessions", label: "Academic Sessions" }],
  },
  {
    label: "People",
    items: [
      { slug: "students", label: "Students" },
      { slug: "faculty", label: "Faculty" },
    ],
  },
  {
    label: "Programs",
    items: [
      { slug: "programs", label: "Programs & Curriculum" },
      { slug: "courses", label: "Courses" },
    ],
  },
  {
    label: "Student Progress",
    items: [
      { slug: "academic-progress", label: "Academic Progress" },
      { slug: "research-proposals", label: "Research & Thesis" },
    ],
  },
  {
    label: "Administration",
    items: [
      { slug: "reports", label: "Reports" },
      { slug: "documents", label: "Documents" },
      { slug: "notices", label: "Notices" },
    ],
  },
  {
    label: "System",
    items: [
      { slug: "settings", label: "Settings" },
      { slug: "users", label: "Users & Roles" },
    ],
  },
];
