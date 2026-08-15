import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getSpecializationFilterOptions } from "@/lib/management/specializations";
import { SpecializationForm } from "../_components/specialization-form";
import { createSpecializationAction } from "../actions";

export default async function NewSpecializationPage() {
  await requireRole("management");

  const { departments } = await getSpecializationFilterOptions();

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
          Add Specialization
        </h1>
      </div>
      <SpecializationForm
        action={createSpecializationAction}
        departments={departments}
        submitLabel="Create"
      />
    </div>
  );
}
