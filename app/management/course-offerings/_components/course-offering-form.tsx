"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { OFFERING_STATUSES } from "@/lib/management/status-enums";
import type { CourseOfferingFormState } from "../actions";

const STATUS_LABELS: Record<(typeof OFFERING_STATUSES)[number], string> = {
  planned: "Planned",
  open: "Open",
  closed: "Closed",
  cancelled: "Cancelled",
};

const DEGREE_LEVEL_LABELS: Record<string, string> = {
  master: "MS/M.Phil.",
  phd: "Ph.D.",
};
const DEGREE_LEVEL_ORDER = ["master", "phd"] as const;

export interface CourseOfferingFormOptions {
  courses: {
    id: string;
    code: string;
    name: string;
    department: { id: string; name: string };
    degreeLevel: string | null;
  }[];
  semesters: { id: string; name: string; academic_year: string }[];
}

export function CourseOfferingForm({
  action,
  options,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: CourseOfferingFormState | undefined,
    formData: FormData
  ) => Promise<CourseOfferingFormState>;
  options: CourseOfferingFormOptions;
  defaultValues?: {
    course_id: string;
    semester_id: string;
    section: string;
    capacity: number | null;
    status: string;
  };
  /** Editing an existing offering still allows changing course/semester/section — the unique (course_id, semester_id, section) constraint is the actual guard against a resulting duplicate. */
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const statusRef = useRef<HTMLSelectElement>(null);

  // Degree Level -> Discipline are pure client-side filters over the
  // already-fetched course list (same small-bounded-dataset reasoning as
  // the Semester Courses drill-down) -- only course_id itself is an actual
  // form field. Pre-seeded from the default course (edit form) so changing
  // an existing offering's course starts from the right cascade instead of
  // resetting to blank.
  const defaultCourse = options.courses.find((c) => c.id === defaultValues?.course_id) ?? null;
  const [level, setLevel] = useState<string>(defaultCourse?.degreeLevel ?? "");
  const [deptId, setDeptId] = useState<string>(defaultCourse?.department.id ?? "");

  const departmentsForLevel = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const c of options.courses) {
      if (level && c.degreeLevel !== level) continue;
      map.set(c.department.id, c.department);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [options.courses, level]);

  const coursesForSelection = useMemo(
    () =>
      options.courses.filter(
        (c) => (!level || c.degreeLevel === level) && (!deptId || c.department.id === deptId)
      ),
    [options.courses, level, deptId]
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const nextStatus = statusRef.current?.value;
        if (defaultValues && nextStatus === "cancelled" && defaultValues.status !== "cancelled") {
          if (!confirm("Cancel this course offering? It will be excluded from official reporting figures and new enrollments.")) {
            e.preventDefault();
          }
        }
      }}
      className="max-w-lg space-y-5 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="degree_level_filter" className={labelClasses}>
            Degree Level
          </label>
          <select
            id="degree_level_filter"
            className={fieldClasses}
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setDeptId("");
            }}
          >
            <option value="">All</option>
            {DEGREE_LEVEL_ORDER.map((l) => (
              <option key={l} value={l}>
                {DEGREE_LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="discipline_filter" className={labelClasses}>
            Discipline
          </label>
          <select
            id="discipline_filter"
            className={fieldClasses}
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
          >
            <option value="">All</option>
            {departmentsForLevel.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="course_id" className={labelClasses}>
          Course
        </label>
        <select
          id="course_id"
          name="course_id"
          defaultValue={defaultValues?.course_id ?? ""}
          required
          className={fieldClasses}
        >
          <option value="" disabled>
            Select a course
          </option>
          {coursesForSelection.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        {options.courses.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">No active courses exist yet.</p>
        )}
        {options.courses.length > 0 && coursesForSelection.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No courses match this Degree Level / Discipline combination.
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="semester_id" className={labelClasses}>
          Semester
        </label>
        <select
          id="semester_id"
          name="semester_id"
          defaultValue={defaultValues?.semester_id ?? ""}
          required
          className={fieldClasses}
        >
          <option value="" disabled>
            Select a semester
          </option>
          {options.semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.academic_year} — {s.name}
            </option>
          ))}
        </select>
        {options.semesters.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No semesters exist yet — create one under Semester Management first.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="section" className={labelClasses}>
            Section
          </label>
          <input
            id="section"
            name="section"
            type="text"
            defaultValue={defaultValues?.section ?? "A"}
            maxLength={20}
            className={fieldClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="capacity" className={labelClasses}>
            Capacity
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min="1"
            step="1"
            defaultValue={defaultValues?.capacity ?? ""}
            placeholder="Unlimited"
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select id="status" name="status" ref={statusRef} defaultValue={defaultValues?.status ?? "planned"} className={fieldClasses}>
          {OFFERING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Only &lsquo;Planned&rsquo;/&lsquo;Open&rsquo; offerings are offered for new enrollment; &lsquo;Cancelled&rsquo;
          offerings are excluded from the enrollment form entirely.
        </p>
      </div>

      {state?.error && (
        <p
          className={`text-sm ${
            state.needsConfirmation
              ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {state.error}
        </p>
      )}

      <input type="hidden" name="confirmed" value={state?.needsConfirmation ? "true" : "false"} />

      <div className="flex items-center gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          {pending ? "Saving..." : state?.needsConfirmation ? "Create Anyway" : submitLabel}
        </button>
        <Link
          href="/management/course-offerings"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
