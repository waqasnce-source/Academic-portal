"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import type { SupervisorOption } from "@/lib/management/research-proposals";
import { updateResearchProjectAction, type ResearchProposalFormState } from "../actions";

export function ResearchProjectEditForm({
  projectId,
  studentId,
  faculty,
  defaultValues,
}: {
  projectId: string;
  studentId: string;
  faculty: SupervisorOption[];
  defaultValues: {
    title: string;
    abstract: string | null;
    research_area: string | null;
    supervisor_id: string | null;
    status: string | null;
  };
}) {
  const boundAction = updateResearchProjectAction.bind(null, projectId, studentId);
  const [state, formAction, pending] = useActionState<ResearchProposalFormState | undefined, FormData>(
    boundAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="space-y-1">
        <label htmlFor="title" className={labelClasses}>
          Project / Proposal Title
        </label>
        <input id="title" name="title" type="text" defaultValue={defaultValues.title} required maxLength={500} className={fieldClasses} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="research_area" className={labelClasses}>
            Research Area
          </label>
          <input
            id="research_area"
            name="research_area"
            type="text"
            defaultValue={defaultValues.research_area ?? ""}
            maxLength={200}
            className={fieldClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="supervisor_id" className={labelClasses}>
            Supervisor
          </label>
          <select id="supervisor_id" name="supervisor_id" defaultValue={defaultValues.supervisor_id ?? ""} className={fieldClasses}>
            <option value="">—</option>
            {faculty.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <input
          id="status"
          name="status"
          type="text"
          defaultValue={defaultValues.status ?? ""}
          maxLength={100}
          placeholder="Free text — no fixed vocabulary for this field"
          className={fieldClasses}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="abstract" className={labelClasses}>
          Abstract
        </label>
        <textarea id="abstract" name="abstract" rows={4} defaultValue={defaultValues.abstract ?? ""} maxLength={4000} className={fieldClasses} />
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
