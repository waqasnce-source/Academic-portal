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
