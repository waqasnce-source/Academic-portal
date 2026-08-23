"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import type { DisciplineGroup } from "@/lib/management/academic-sessions";

/**
 * Client-side search + discipline/degree-level/faculty filtering over one
 * semester's already-fetched, already-grouped course list. Deliberately
 * NOT a server round-trip: a single semester's offerings are a small,
 * bounded dataset (never paginated to begin with), so filtering the data
 * already on the page is the right tool here — converting this into a
 * server-side filtered query would be the "unnecessarily convert an
 * efficient server-side query into a large fetch-and-filter" anti-pattern
 * in reverse (there's no large query to protect; the whole point is this
 * data is small). Compare app/management/course-offerings, whose list
 * IS server-paginated across the whole institution and keeps its filters
 * server-side for exactly that reason.
 *
 * Only display-label maps are duplicated here (OFFERING_STATUS_TONE,
 * DEGREE_LEVEL_LABELS) — matching the existing precedent in
 * offering-roster-table.tsx — never the degree-level DETERMINATION logic
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

function degreeLevelLabel(level: string | null): string {
  return level ? (DEGREE_LEVEL_LABELS[level] ?? level) : "Unknown";
}

type DegreeFilter = "" | "master" | "phd" | "unknown";

export function SemesterCourseExplorer({ disciplines }: { disciplines: DisciplineGroup[] }) {
  const [search, setSearch] = useState("");
  const [disciplineId, setDisciplineId] = useState("");
  const [degreeFilter, setDegreeFilter] = useState<DegreeFilter>("");
  const [facultyId, setFacultyId] = useState("");

  const allFaculty = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of disciplines) {
      for (const course of group.courses) {
        for (const f of course.faculty) map.set(f.id, f.name);
      }
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [disciplines]);

  const q = search.trim().toLowerCase();

  const filteredDisciplines = disciplines
    .filter((group) => !disciplineId || group.department.id === disciplineId)
    .map((group) => ({
      ...group,
      courses: group.courses.filter((course) => {
        if (degreeFilter === "unknown" && course.degreeLevel !== null) return false;
        if ((degreeFilter === "master" || degreeFilter === "phd") && course.degreeLevel !== degreeFilter) return false;
        if (facultyId && !course.faculty.some((f) => f.id === facultyId)) return false;
        if (q) {
          const haystack = [course.courseCode, course.courseName, ...course.faculty.map((f) => f.name)]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      }),
    }));

  const hasActiveFilters = Boolean(q || disciplineId || degreeFilter || facultyId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <label htmlFor="course-search" className={labelClasses}>
            Search by course number, title, or faculty name
          </label>
          <input
            id="course-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Geol.731 or Engineering Geology"
            className={fieldClasses}
          />
        </div>

        <div className="flex min-w-[180px] flex-col gap-1">
          <label htmlFor="discipline-filter" className={labelClasses}>
            Discipline
          </label>
          <select
            id="discipline-filter"
            className={fieldClasses}
            value={disciplineId}
            onChange={(e) => setDisciplineId(e.target.value)}
          >
            <option value="">All</option>
            {disciplines.map((group) => (
              <option key={group.department.id} value={group.department.id}>
                {group.department.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[160px] flex-col gap-1">
          <label htmlFor="degree-level-filter" className={labelClasses}>
            Degree Level
          </label>
          <select
            id="degree-level-filter"
            className={fieldClasses}
            value={degreeFilter}
            onChange={(e) => setDegreeFilter(e.target.value as DegreeFilter)}
          >
            <option value="">All</option>
            <option value="master">MS/M.Phil.</option>
            <option value="phd">Ph.D.</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div className="flex min-w-[180px] flex-col gap-1">
          <label htmlFor="faculty-filter" className={labelClasses}>
            Faculty
          </label>
          <select
            id="faculty-filter"
            className={fieldClasses}
            value={facultyId}
            onChange={(e) => setFacultyId(e.target.value)}
          >
            <option value="">All</option>
            {allFaculty.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setDisciplineId("");
              setDegreeFilter("");
              setFacultyId("");
            }}
            className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            Reset
          </button>
        )}
      </div>

      <div className="space-y-8">
        {filteredDisciplines.map((group) => (
          <section key={group.department.id} className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {group.department.name} ({group.courses.length})
            </h2>

            {group.courses.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {disciplines.find((d) => d.department.id === group.department.id)?.courses.length === 0
                  ? "No courses have been offered in this discipline this semester."
                  : "No courses match the current filters."}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
                        Course No.
                      </th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
                        Course Title
                      </th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
                        Degree Level
                      </th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
                        Faculty
                      </th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">
                        CH
                      </th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">
                        Students
                      </th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {group.courses.map((course) => (
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
                        <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                          {degreeLevelLabel(course.degreeLevel)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                          {course.faculty.length > 0 ? (
                            <span className="flex flex-wrap gap-x-1.5">
                              {course.faculty.map((f, i) => (
                                <span key={f.id}>
                                  <Link
                                    href={`/management/faculty/${f.id}`}
                                    className="hover:underline"
                                  >
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
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
