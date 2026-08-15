import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getSpecializationById, getSpecializationFilterOptions } from "@/lib/management/specializations";
import { UUID_RE } from "@/lib/management/query-params";
import { SpecializationForm } from "../../_components/specialization-form";
import { updateSpecializationAction } from "../../actions";

export default async function EditSpecializationPage(
  props: PageProps<"/management/specializations/[id]/edit">
) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const [specialization, { departments }] = await Promise.all([
    getSpecializationById(id),
    getSpecializationFilterOptions(),
  ]);
  if (!specialization) notFound();

  const action = updateSpecializationAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/specializations"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Specializations
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Edit Specialization
        </h1>
      </div>
      <SpecializationForm
        action={action}
        departments={departments}
        defaultValues={specialization}
        submitLabel="Save changes"
      />
    </div>
  );
}
