import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getActiveStudentOptions } from "@/lib/management/extensions";
import { getFacultyOptions } from "@/lib/management/research-proposals";
import { ResearchProjectCreateForm } from "../_components/research-project-create-form";

export default async function NewResearchProjectPage() {
  await requireRole("management");

  const [students, faculty] = await Promise.all([getActiveStudentOptions(), getFacultyOptions()]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/research-proposals"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          ← GSC/ASRB Research Proposals
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">New Research Project</h1>
      </div>
      <ResearchProjectCreateForm students={students} faculty={faculty} />
    </div>
  );
}
