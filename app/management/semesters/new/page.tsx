import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { SemesterForm } from "../_components/semester-form";
import { createSemesterAction } from "../actions";

export default async function NewSemesterPage() {
  await requireRole("management");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/semesters"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          ← Semesters
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Add Semester
        </h1>
      </div>
      <SemesterForm action={createSemesterAction} submitLabel="Create" />
    </div>
  );
}
