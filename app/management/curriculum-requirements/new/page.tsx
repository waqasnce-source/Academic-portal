import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getCurriculumRequirementFilterOptions,
  getCourseOptions,
} from "@/lib/management/curriculum-requirements";
import { CurriculumRequirementForm } from "../_components/curriculum-requirement-form";
import { createCurriculumRequirementAction } from "../actions";

export default async function NewCurriculumRequirementPage() {
  await requireRole("management");

  const [{ programs, specializations }, courses] = await Promise.all([
    getCurriculumRequirementFilterOptions(),
    getCourseOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/curriculum-requirements"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          ← Curriculum Requirements
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">Add Requirement</h1>
      </div>
      <CurriculumRequirementForm
        action={createCurriculumRequirementAction}
        options={{ programs, specializations, courses }}
        submitLabel="Create Requirement"
      />
    </div>
  );
}
