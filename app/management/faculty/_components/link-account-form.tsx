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
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No unlinked faculty accounts are available to link. An account must already exist (role=faculty, not yet
        attached to another faculty record) before it can be linked here.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-64">
        <label htmlFor="profileId" className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Existing account
        </label>
        <select
          id="profileId"
          name="profileId"
          required
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Linking..." : "Link Account"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>}
    </form>
  );
}
