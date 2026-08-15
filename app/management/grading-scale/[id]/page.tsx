import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getGradingScaleBandById } from "@/lib/management/grading-scale";
import { UUID_RE } from "@/lib/management/query-params";
import { GradingScaleForm } from "../_components/grading-scale-form";
import { updateGradingScaleBandAction } from "../actions";

export default async function EditGradingScaleBandPage(props: PageProps<"/management/grading-scale/[id]">) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const band = await getGradingScaleBandById(id);
  if (!band) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/grading-scale"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Grading Scale
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Edit Grading Band</h1>
      </div>
      <GradingScaleForm
        action={updateGradingScaleBandAction.bind(null, band.id)}
        defaultValues={band}
        submitLabel="Save Changes"
      />
    </div>
  );
}
