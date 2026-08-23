"use client";

import { useActionState } from "react";
import { linkFacultyAccountAction, type LinkAccountFormState } from "../actions";
import type { UnlinkedProfileOption } from "@/lib/management/accounts";

export function LinkFacultyAccountForm({
  facultyId,
  options,
}: {
  facultyId: string;
  options: UnlinkedProfileOption[];
}) {
  const boundAction = linkFacultyAccountAction.bind(null, facultyId);
  const [state, formAction, pending] = useActionState<LinkAccountFormState | undefined, FormData>(
    boundAction,
    undefined
  );

  if (options.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No unlinked faculty accounts are available to link. An account must already exist (role=faculty, not yet
        attached to another faculty record) before it can be linked here.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-64">
        <label htmlFor="profileId" className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Existing account
        </label>
        <select
          id="profileId"
          name="profileId"
          required
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
        >
          <option value="">Select an account...</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.full_name} ({o.email})
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
      >
        {pending ? "Linking..." : "Link Account"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>}
    </form>
  );
}
