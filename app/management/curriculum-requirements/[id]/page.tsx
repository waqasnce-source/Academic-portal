import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  getCurriculumRequirementById,
  getCurriculumRequirementFilterOptions,
  getCourseOptions,
} from "@/lib/management/curriculum-requirements";
import { UUID_RE } from "@/lib/management/query-params";
import { CurriculumRequirementForm } from "../_components/curriculum-requirement-form";
import { updateCurriculumRequirementAction } from "../actions";

export default async function EditCurriculumRequirementPage(
  props: PageProps<"/management/curriculum-requirements/[id]">
) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const requirement = await getCurriculumRequirementById(id);
  if (!requirement) notFound();

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
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">Edit Requirement</h1>
      </div>
      <CurriculumRequirementForm
        action={updateCurriculumRequirementAction.bind(null, requirement.id)}
        options={{ programs, specializations, courses }}
        defaultValues={requirement}
        submitLabel="Save Changes"
      />
    </div>
  );
}
