import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getProgramFilterOptions } from "@/lib/management/programs";
import { ProgramForm } from "../_components/program-form";
import { createProgramAction } from "../actions";

export default async function NewProgramPage() {
  await requireRole("management");

  const { departments } = await getProgramFilterOptions();

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
          Add Program
        </h1>
      </div>
      <ProgramForm action={createProgramAction} departments={departments} submitLabel="Create" />
    </div>
  );
}
