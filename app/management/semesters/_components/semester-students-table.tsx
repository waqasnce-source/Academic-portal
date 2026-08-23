"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { StudentStatusBadge } from "@/app/_components/academic-status";
import type { SemesterStudentRow } from "@/lib/management/academic-sessions";

/**
 * Mirrors OVERALL_STAGES from lib/academic/status-engine.ts exactly.
 * Duplicated (not imported) deliberately: that module imports
 * "server-only" (transitively, via milestones.ts/extensions.ts), and this
 * is a "use client" component — importing a value from it would drag that
 * whole server-only chain into the browser bundle, the same issue already
 * solved the same way in progression-rules.ts/milestone-timeline.tsx.
 */
const OVERALL_STAGES = ["Admission", "Coursework", "Proposal", "Research", "Thesis", "Defense", "Completion", "Needs Review"] as const;

/** Local display-only map, matching the precedent already established in offering-roster-table.tsx / semester-course-explorer.tsx — never the source of degree-level truth. */
const DEGREE_LEVEL_LABELS: Record<string, string> = {
  diploma: "Diploma",
  bachelor: "Bachelor",
  master: "MS/M.Phil.",
  phd: "Ph.D.",
};

const ACCOUNT_STATUS_TONE: Record<string, string> = {
  active: "text-emerald-700 dark:text-emerald-400",
  inactive: "text-slate-500 dark:text-slate-400",
  graduated: "text-blue-700 dark:text-blue-400",
  suspended: "text-red-700 dark:text-red-400",
  withdrawn: "text-red-700 dark:text-red-400",
};

export function SemesterStudentsTable({
  students,
  semesterId,
  semesterLabel,
}: {
  students: SemesterStudentRow[];
  semesterId: string;
  semesterLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [degreeFilter, setDegreeFilter] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState("");

  const programs = useMemo(() => {
    const set = new Set(students.map((s) => s.program?.name).filter((n): n is string => Boolean(n)));
    return [...set].sort();
  }, [students]);

  const disciplines = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) if (s.discipline) map.set(s.discipline.id, s.discipline.name);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const q = search.trim().toLowerCase();

  const filtered = students.filter((s) => {
    if (programFilter && s.program?.name !== programFilter) return false;
    if (degreeFilter && s.program?.degreeLevel !== degreeFilter) return false;
    if (disciplineFilter && s.discipline?.id !== disciplineFilter) return false;
    if (stageFilter && s.academicStage !== stageFilter) return false;
    if (enrollmentStatusFilter && !s.courses.some((c) => c.enrollmentStatus === enrollmentStatusFilter)) return false;
    if (q) {
      const haystack = `${s.name} ${s.email ?? ""} ${s.studentNumber}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const hasActiveFilters = Boolean(q || programFilter || degreeFilter || disciplineFilter || stageFilter || enrollmentStatusFilter);

  const backHref = `/management/semesters/${semesterId}/students`;
  const backLabel = `${semesterLabel} Students`;
  const backParams = `?backHref=${encodeURIComponent(backHref)}&backLabel=${encodeURIComponent(backLabel)}`;

  if (students.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No students are enrolled in this semester yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <label htmlFor="student-search" className={labelClasses}>
            Search by name, email, or student ID
          </label>
          <input id="student-search" type="text" value={search} onChange={(e) => setSearch(e.target.value)} className={fieldClasses} />
        </div>
        <div className="flex min-w-[200px] flex-col gap-1">
          <label htmlFor="program-filter" className={labelClasses}>
            Program
          </label>
          <select id="program-filter" className={fieldClasses} value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
            <option value="">All</option>
            {programs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[160px] flex-col gap-1">
          <label htmlFor="degree-filter" className={labelClasses}>
            Degree Level
          </label>
          <select id="degree-filter" className={fieldClasses} value={degreeFilter} onChange={(e) => setDegreeFilter(e.target.value)}>
            <option value="">All</option>
            <option value="master">MS/M.Phil.</option>
            <option value="phd">Ph.D.</option>
          </select>
        </div>
        <div className="flex min-w-[180px] flex-col gap-1">
          <label htmlFor="discipline-filter" className={labelClasses}>
            Discipline
          </label>
          <select id="discipline-filter" className={fieldClasses} value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value)}>
            <option value="">All</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[160px] flex-col gap-1">
          <label htmlFor="stage-filter" className={labelClasses}>
            Academic Stage
          </label>
          <select id="stage-filter" className={fieldClasses} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="">All</option>
            {OVERALL_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[160px] flex-col gap-1">
          <label htmlFor="enrollment-status-filter" className={labelClasses}>
            Enrollment Status
          </label>
          <select
            id="enrollment-status-filter"
            className={fieldClasses}
            value={enrollmentStatusFilter}
            onChange={(e) => setEnrollmentStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setProgramFilter("");
              setDegreeFilter("");
              setDisciplineFilter("");
              setStageFilter("");
              setEnrollmentStatusFilter("");
            }}
            className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            Reset
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing {filtered.length} of {students.length} students. Dropped enrollments are excluded from every
        student&apos;s course list and credit-hour total here (see the offering roster to view them). Stage,
        milestones, and overall status are the student&apos;s current cumulative degree progress — not scoped to this
        semester.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Student</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Program</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Degree</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Supervisor</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Courses (this semester)</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Coursework CH</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Stage</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Milestones</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Overall Status</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Account</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <Link
                    href={`/management/academic-progress/${s.id}${backParams}`}
                    className="font-medium text-slate-900 hover:underline dark:text-slate-50"
                  >
                    {s.name}
                  </Link>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {s.studentNumber} · <Link href={`/management/students/${s.id}`} className="hover:underline">Record</Link>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{s.program?.name ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                  {s.program ? (DEGREE_LEVEL_LABELS[s.program.degreeLevel] ?? s.program.degreeLevel) : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">{s.supervisorName ?? "Not assigned"}</td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                  <div className="flex flex-wrap gap-x-1.5">
                    {s.courses.map((c, i) => (
                      <Link key={c.offeringId} href={`/management/course-offerings/${c.offeringId}`} className="hover:underline">
                        {c.code}
                        {i < s.courses.length - 1 ? ";" : ""}
                      </Link>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                  {s.requiredCH != null ? `${s.completedCH} / ${s.requiredCH}` : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">{s.academicStage ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                  {s.milestonesRequired != null ? `${s.milestonesCompleted} / ${s.milestonesRequired}` : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {s.overallStatusLabel ? <StudentStatusBadge statusLabel={s.overallStatusLabel} /> : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <span className={`font-medium capitalize ${ACCOUNT_STATUS_TONE[s.status] ?? "text-slate-700 dark:text-slate-300"}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
