"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { validateImportAction, confirmImportAction } from "../actions";
import type { ImportType, ImportPreview, ImportOutcome, ImportRowResult, RowStatus, ExpectedSemester } from "@/lib/management/import/types";

const IMPORT_TYPES: { type: ImportType; label: string; description: string }[] = [
  { type: "courses", label: "Course Catalogue", description: "Create or match courses in the permanent course catalogue." },
  { type: "offerings", label: "Course Offerings", description: "Offer catalogue courses in a specific academic session and semester, with faculty assigned." },
  { type: "students", label: "Students", description: "Create or match student master records." },
  { type: "enrollments", label: "Enrollments", description: "Enroll students into existing course offerings." },
];

const STATUS_STYLES: Record<RowStatus, string> = {
  valid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  error: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

type Step = "select" | "upload" | "preview" | "results";

export function ImportWizard({
  initialType = null,
  expectedSemester = null,
}: {
  /** Set when arriving from a contextual entry point (e.g. the Semester Operations dashboard) — skips the type-selection step. */
  initialType?: ImportType | null;
  /** Threaded through to validation so offerings/enrollments rows targeting a different semester than the one this import was opened from are flagged, not silently imported unnoticed. */
  expectedSemester?: ExpectedSemester | null;
}) {
  const [step, setStep] = useState<Step>(initialType ? "upload" : "select");
  const [type, setType] = useState<ImportType | null>(initialType);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview<unknown> | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function selectType(t: ImportType) {
    setType(t);
    setStep("upload");
    setError(null);
  }

  async function handleUpload() {
    if (!type || !fileInputRef.current?.files?.[0]) {
      setError("Please choose a file to upload.");
      return;
    }
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", fileInputRef.current.files[0]);

    const result = await validateImportAction(type, formData, expectedSemester ?? undefined);
    setBusy(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setPreview(result);
    setStep("preview");
  }

  async function handleConfirm() {
    if (!type || !preview) return;
    setBusy(true);
    const result = await confirmImportAction(type, preview.rows as ImportRowResult<unknown>[]);
    setBusy(false);
    setOutcome(result);
    setStep("results");
  }

  function goToSelectType() {
    setStep("select");
    setType(null);
    setPreview(null);
    setOutcome(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function reset() {
    // Coming from a contextual entry point (a semester's own page):
    // return to the same type + semester context rather than dropping
    // back to the generic type-selection step, since the next action is
    // usually "import more of the same thing for this semester."
    setStep(initialType ? "upload" : "select");
    setType(initialType);
    setPreview(null);
    setOutcome(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        {(["select", "upload", "preview", "results"] as Step[]).map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-3 py-1 ${
              step === s
                ? "bg-brand-800 text-white dark:bg-brand-600"
                : "bg-slate-100 dark:bg-slate-900"
            }`}
          >
            {i + 1}. {s === "select" ? "Select Type" : s === "upload" ? "Upload & Validate" : s === "preview" ? "Preview & Confirm" : "Results"}
          </li>
        ))}
      </ol>

      {step === "select" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {IMPORT_TYPES.map((it) => (
            <button
              key={it.type}
              type="button"
              onClick={() => selectType(it.type)}
              className="block rounded-lg border border-slate-200 bg-white p-5 text-left hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600"
            >
              <h2 className="font-semibold text-slate-900 dark:text-slate-50">{it.label}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{it.description}</p>
            </button>
          ))}
        </div>
      )}

      {step === "upload" && type && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-slate-50">
              {IMPORT_TYPES.find((it) => it.type === type)?.label}
            </h2>
            <button type="button" onClick={goToSelectType} className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50">
              Change type
            </button>
          </div>

          {expectedSemester && (
            <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
              Target semester: <strong>{expectedSemester.name} {expectedSemester.academicYear}</strong> — rows in
              your file for a different semester are still imported, but flagged as a warning so you notice.
            </p>
          )}

          <a
            href={`/management/bulk-import/template/${type}`}
            className="inline-block text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            Download blank template (.xlsx)
          </a>

          <div className="flex flex-col gap-2">
            <label htmlFor="import-file" className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Select .xlsx or .csv file
            </label>
            <input
              id="import-file"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="rounded-md border border-slate-300 bg-transparent px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:text-slate-50"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleUpload}
            disabled={busy}
            className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            {busy ? "Validating..." : "Validate"}
          </button>
        </div>
      )}

      {step === "preview" && type && preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              {preview.validCount} valid
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              {preview.warningCount} warnings
            </span>
            <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
              {preview.errorCount} errors
            </span>
            <span className="text-slate-500 dark:text-slate-400">{preview.rows.length} rows total</span>
          </div>

          <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Row</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{row.rowNumber}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[row.status]}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.messages.join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy || preview.validCount + preview.warningCount === 0}
              className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              {busy
                ? "Importing..."
                : `Import ${preview.validCount + preview.warningCount} record${preview.validCount + preview.warningCount === 1 ? "" : "s"}`}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              Cancel
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Error rows are always excluded. Nothing is written to the database until you click Import.
            </p>
          </div>
        </div>
      )}

      {step === "results" && outcome && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ResultStat label="Created" value={outcome.created} />
            <ResultStat label="Already Existed" value={outcome.matched} />
            <ResultStat label="Skipped" value={outcome.skipped} />
            <ResultStat label="Errors" value={outcome.errors.length} />
          </div>

          {outcome.errors.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Row</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {outcome.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{e.rowNumber}</td>
                      <td className="px-4 py-2.5 text-red-600 dark:text-red-400">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              Import another file
            </button>
            <Link
              href="/management/academic-sessions"
              className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              View Academic Sessions
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}
