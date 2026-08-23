import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getCurrentFacultyId } from "@/lib/academic/identity";
import { getSuperviseesWithStatus } from "@/lib/academic/supervisors";
import { STUDENT_STATUS_LABELS, type StudentStatusLabel } from "@/lib/academic/status-engine";
import { StudentStatusBadge } from "@/app/_components/academic-status";
import { EmptyState } from "@/app/management/_components/empty-state";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";

function firstValue(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function FacultyStudentsPage(props: PageProps<"/faculty/students">) {
  const profile = await requireRole("faculty");
  const facultyId = await getCurrentFacultyId(profile.id);

  if (!facultyId) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-700">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No faculty record found</p>
      </div>
    );
  }

  const supervisees = await getSuperviseesWithStatus(facultyId);

  const rawSearchParams = await props.searchParams;
  const programFilter = firstValue(rawSearchParams.program).trim();
  const disciplineFilter = firstValue(rawSearchParams.discipline).trim();
  const specializationFilter = firstValue(rawSearchParams.specialization).trim();
  const rawStatus = firstValue(rawSearchParams.status).trim();
  const statusFilter = (STUDENT_STATUS_LABELS as readonly string[]).includes(rawStatus)
    ? (rawStatus as StudentStatusLabel)
    : "";

  const programs = uniqueByLabel(supervisees.map((s) => s.student.program?.name).filter(Boolean) as string[]);
  const disciplines = uniqueByLabel(
    supervisees.map((s) => s.student.program?.department?.name).filter(Boolean) as string[]
  );
  const specializations = uniqueByLabel(
    supervisees.map((s) => s.student.specialization?.name).filter(Boolean) as string[]
  );

  const filtered = supervisees.filter((s) => {
    if (programFilter && s.student.program?.name !== programFilter) return false;
    if (disciplineFilter && s.student.program?.department?.name !== disciplineFilter) return false;
    if (specializationFilter && s.student.specialization?.name !== specializationFilter) return false;
    if (statusFilter && s.academicStatus?.statusLabel !== statusFilter) return false;
    return true;
  });

  const hasActiveFilters = Boolean(programFilter || disciplineFilter || specializationFilter || statusFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">My Students</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {filtered.length.toLocaleString()} of {supervisees.length.toLocaleString()} supervisee
          {supervisees.length === 1 ? "" : "s"} shown
        </p>
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
      >
        <SelectFilter name="program" label="Program" value={programFilter} options={programs} />
        <SelectFilter name="discipline" label="Discipline" value={disciplineFilter} options={disciplines} />
        <SelectFilter name="specialization" label="Specialization" value={specializationFilter} options={specializations} />
        <div className="flex min-w-[140px] flex-col gap-1">
          <label htmlFor="status" className={labelClasses}>
            Status
          </label>
          <select id="status" name="status" defaultValue={statusFilter} className={fieldClasses}>
            <option value="">All</option>
            {STUDENT_STATUS_LABELS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            Apply
          </button>
          <Link
            href="/faculty/students"
            className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            Reset
          </Link>
        </div>
      </form>

      {filtered.length === 0 ? (
        <EmptyState entityLabelPlural="students" hasActiveFilters={hasActiveFilters} clearHref="/faculty/students" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Student</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Program</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Discipline</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Specialization</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Current Stage</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                    <Link href={`/faculty/students/${s.student.id}`} className="hover:underline">
                      {s.student.profile?.full_name ?? s.student.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                    {s.student.program?.name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                    {s.student.program?.department?.name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                    {s.student.specialization?.name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                    {s.academicStatus?.currentStage ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {s.academicStatus ? <StudentStatusBadge statusLabel={s.academicStatus.statusLabel} /> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function uniqueByLabel(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function SelectFilter({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
}) {
  return (
    <div className="flex min-w-[160px] flex-col gap-1">
      <label htmlFor={name} className={labelClasses}>
        {label}
      </label>
      <select id={name} name={name} defaultValue={value} className={fieldClasses}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
