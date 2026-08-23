import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getManagementModule } from "@/lib/management/modules";

export default async function ManagementModulePage(
  props: PageProps<"/management/[module]">
) {
  await requireRole("management");

  const { module: slug } = await props.params;
  const mod = getManagementModule(slug);
  if (!mod) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
        {mod.label}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
        {mod.description}
      </p>
      <p className="mt-6 inline-block rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-400">
        This module is not built yet.
      </p>
    </div>
  );
}
