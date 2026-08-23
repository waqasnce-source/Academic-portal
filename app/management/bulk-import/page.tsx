import { requireRole } from "@/lib/supabase/dal";
import { ImportWizard } from "./_components/import-wizard";
import type { ImportType } from "@/lib/management/import/types";

const VALID_TYPES: readonly ImportType[] = ["courses", "offerings", "students", "enrollments"];

function firstValue(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function BulkImportPage(props: PageProps<"/management/bulk-import">) {
  await requireRole("management");

  const searchParams = await props.searchParams;
  const rawType = firstValue(searchParams.type);
  const initialType = (VALID_TYPES as readonly string[]).includes(rawType) ? (rawType as ImportType) : null;
  const year = firstValue(searchParams.year).trim();
  const semester = firstValue(searchParams.semester).trim();
  const expectedSemester = year && semester ? { academicYear: year, name: semester } : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Bulk Import</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Import Course Catalogue, Course Offerings, Students, or Enrollments from an Excel (.xlsx) or CSV file.
          Nothing is written to the database until you review the preview and confirm — importing the same file
          twice will not create duplicates.
        </p>
      </div>

      <ImportWizard initialType={initialType} expectedSemester={expectedSemester} />
    </div>
  );
}
