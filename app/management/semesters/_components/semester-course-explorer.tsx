"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import type { DisciplineGroup } from "@/lib/management/academic-sessions";

/**
 * Client-side drill-down over one semester's already-fetched, already-
 * grouped course list — Degree Level (MS/M.Phil. | Ph.D.) -> Discipline ->
 * course table, per explicit request rather than one flat filterable
 * table. Deliberately NOT a server round-trip: a single semester's
 * offerings are a small, bounded dataset (never paginated to begin with).
 * Search bypasses the drill-down entirely so a course/faculty lookup
 * doesn't require knowing its degree level or discipline first.
 *
 * Only display-label maps are duplicated here (OFFERING_STATUS_TONE,
 * DEGREE_LEVEL_LABELS) — never the degree-level DETERMINATION logic
 * itself, which stays solely in lib/management/academic-sessions.ts.
 */

const OFFERING_STATUS_TONE: Record<string, "success" | "info" | "neutral" | "danger"> = {
  open: "success",
  planned: "info",
  closed: "neutral",
  cancelled: "danger",
};

const DEGREE_LEVEL_LABELS: Record<string, string> = {
  master: "MS/M.Phil.",
  phd: "Ph.D.",
};

type DegreeLevel = "master" | "phd";
type CourseRow = DisciplineGroup["courses"][number];

export function SemesterCourseExplorer({ disciplines }: { disciplines: DisciplineGroup[] }) {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<DegreeLevel>("master");
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);

  const q = search.trim().toLowerCase();

  // Search bypasses the drill-down entirely — flat matches across every discipline and degree level.
  const searchResults = useMemo(() => {
    if (!q) return null;
    return disciplines.flatMap((group) =>
      group.courses
        .filter((course) => {
          const haystack = [course.courseCode, course.courseName, ...course.faculty.map((f) => f.name)]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        })
        .map((course) => ({ course, departmentName: group.department.name }))
    );
  }, [disciplines, q]);

  // The four disciplines, scoped to the selected degree level, with per-discipline counts for that level.
  const disciplinesForLevel = useMemo(
    () =>
      disciplines.map((group) => ({
        department: group.department,
        courses: group.courses.filter((c) => c.degreeLevel === level),
      })),
    [disciplines, level]
  );

  const expandedGroup = disciplinesForLevel.find((g) => g.department.id === expandedDeptId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="course-search" className={labelClasses}>
          Search by course number, title, or faculty name
        </label>
        <input
          id="course-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. Geol.731 or Engineering Geology"
          className={`max-w-md ${fieldClasses}`}
        />
      </div>

      {searchResults ? (
        <CourseTable
          rows={searchResults}
          showDiscipline
          showDegreeLevel
          emptyMessage="No courses match your search."
        />
      ) : (
        <>
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
            {(["master", "phd"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  setLevel(lvl);
                  setExpandedDeptId(null);
                }}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                  level === lvl
                    ? "border-brand-700 text-brand-800 dark:border-brand-400 dark:text-brand-300"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                }`}
              >
                {DEGREE_LEVEL_LABELS[lvl]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {disciplinesForLevel.map((group) => {
              const isExpanded = group.department.id === expandedDeptId;
              return (
                <button
                  key={group.department.id}
                  type="button"
                  onClick={() => setExpandedDeptId(isExpanded ? null : group.department.id)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    isExpanded
                      ? "border-brand-700 bg-white ring-1 ring-brand-700 dark:border-brand-400 dark:bg-slate-950 dark:ring-brand-400"
                      : "border-slate-200 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600"
                  }`}
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{group.department.name}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {group.courses.length} course{group.courses.length === 1 ? "" : "s"}
                  </p>
                </button>
              );
            })}
          </div>

          {expandedGroup && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {expandedGroup.department.name} — {DEGREE_LEVEL_LABELS[level]} ({expandedGroup.courses.length})
              </h2>
              <CourseTable
                rows={expandedGroup.courses.map((course) => ({ course }))}
                showDiscipline={false}
                showDegreeLevel={false}
                emptyMessage={`No ${DEGREE_LEVEL_LABELS[level]} courses have been offered in ${expandedGroup.department.name} this semester.`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CourseTable({
  rows,
  showDiscipline,
  showDegreeLevel,
  emptyMessage,
}: {
  rows: { course: CourseRow; departmentName?: string }[];
  showDiscipline: boolean;
  showDegreeLevel: boolean;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Course No.</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Course Title</th>
            {showDiscipline && (
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Discipline</th>
            )}
            {showDegreeLevel && (
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Degree Level</th>
            )}
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Faculty</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">CH</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Students</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map(({ course, departmentName }) => (
            <tr key={course.offeringId}>
              <td className="whitespace-nowrap px-4 py-2.5">
                <Link
                  href={`/management/course-offerings/${course.offeringId}`}
                  className="font-medium text-slate-900 hover:underline dark:text-slate-50"
                >
                  {course.courseCode}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{course.courseName}</td>
              {showDiscipline && (
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{departmentName}</td>
              )}
              {showDegreeLevel && (
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                  {course.degreeLevel ? (DEGREE_LEVEL_LABELS[course.degreeLevel] ?? course.degreeLevel) : "Unknown"}
                </td>
              )}
              <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                {course.faculty.length > 0 ? (
                  <span className="flex flex-wrap gap-x-1.5">
                    {course.faculty.map((f, i) => (
                      <span key={f.id}>
                        <Link href={`/management/faculty/${f.id}`} className="hover:underline">
                          {f.name}
                        </Link>
                        {i < course.faculty.length - 1 ? ";" : ""}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-600">TBA</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                {course.creditHours}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                {course.studentCount}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge
                  label={course.offeringStatus}
                  tone={OFFERING_STATUS_TONE[course.offeringStatus] ?? "neutral"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
