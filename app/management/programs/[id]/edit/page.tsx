import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getProgramById, getProgramFilterOptions } from "@/lib/management/programs";
import { UUID_RE } from "@/lib/management/query-params";
import { ProgramForm } from "../../_components/program-form";
import { updateProgramAction } from "../../actions";

export default async function EditProgramPage(
  props: PageProps<"/management/programs/[id]/edit">
) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const [program, { departments }] = await Promise.all([
    getProgramById(id),
    getProgramFilterOptions(),
  ]);
  if (!program) notFound();

  const action = updateProgramAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/programs"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          ← Programs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Edit Program
        </h1>
      </div>
      <ProgramForm
        action={action}
        departments={departments}
        defaultValues={program}
        submitLabel="Save changes"
      />
    </div>
  );
}
