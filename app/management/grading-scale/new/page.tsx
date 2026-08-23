import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { GradingScaleForm } from "../_components/grading-scale-form";
import { createGradingScaleBandAction } from "../actions";

export default async function NewGradingScaleBandPage() {
  await requireRole("management");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/grading-scale"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          ← Grading Scale
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">Add Grading Band</h1>
      </div>
      <GradingScaleForm action={createGradingScaleBandAction} submitLabel="Create Band" />
    </div>
  );
}
