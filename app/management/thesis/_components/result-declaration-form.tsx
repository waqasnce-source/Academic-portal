"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { upsertResultDeclarationAction, type ThesisFormState } from "../actions";

export function ResultDeclarationForm({
  studentId,
  thesisId,
  existingId,
  defaultValues,
}: {
  studentId: string;
  thesisId: string;
  existingId: string | null;
  defaultValues?: {
    declaration_date: string | null;
    status: string | null;
    clearance_uop: boolean;
    clearance_nceg: boolean;
    library_submission: boolean;
    it_submission: boolean;
    secrecy_submission: boolean;
    examiner_fee_status: string | null;
    transcript_status: string | null;
    remarks: string | null;
  };
}) {
  const boundAction = upsertResultDeclarationAction.bind(null, studentId, thesisId, existingId);
  const [state, formAction, pending] = useActionState<ThesisFormState | undefined, FormData>(boundAction, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="declaration_date" className={labelClasses}>
            Declaration Date
          </label>
          <input id="declaration_date" name="declaration_date" type="date" defaultValue={defaultValues?.declaration_date ?? ""} className={fieldClasses} />
        </div>
        <div className="space-y-1">
          <label htmlFor="result_status" className={labelClasses}>
            Status
          </label>
          <input id="result_status" name="status" type="text" defaultValue={defaultValues?.status ?? ""} maxLength={100} className={fieldClasses} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Checkbox name="clearance_uop" label="UoP Clearance" defaultChecked={defaultValues?.clearance_uop} />
        <Checkbox name="clearance_nceg" label="NCEG Clearance" defaultChecked={defaultValues?.clearance_nceg} />
        <Checkbox name="library_submission" label="Library Submission" defaultChecked={defaultValues?.library_submission} />
        <Checkbox name="it_submission" label="IT Submission" defaultChecked={defaultValues?.it_submission} />
        <Checkbox name="secrecy_submission" label="Secrecy Submission" defaultChecked={defaultValues?.secrecy_submission} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="examiner_fee_status" className={labelClasses}>
            Examiner Fee Status
          </label>
          <input
            id="examiner_fee_status"
            name="examiner_fee_status"
            type="text"
            defaultValue={defaultValues?.examiner_fee_status ?? ""}
            maxLength={100}
            className={fieldClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="transcript_status" className={labelClasses}>
            Transcript Status
          </label>
          <input
            id="transcript_status"
            name="transcript_status"
            type="text"
            defaultValue={defaultValues?.transcript_status ?? ""}
            maxLength={100}
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="result_remarks" className={labelClasses}>
          Remarks
        </label>
        <textarea id="result_remarks" name="remarks" rows={2} defaultValue={defaultValues?.remarks ?? ""} maxLength={2000} className={fieldClasses} />
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked ?? false}
        className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
      />
      {label}
    </label>
  );
}
