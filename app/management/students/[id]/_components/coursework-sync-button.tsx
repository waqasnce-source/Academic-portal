"use client";

import { useActionState } from "react";
import { syncCourseworkMilestoneAction, type SyncCourseworkFormState } from "../actions";

export function CourseworkSyncButton({ studentId }: { studentId: string }) {
  const boundAction = syncCourseworkMilestoneAction.bind(null, studentId);
  const [state, formAction, pending] = useActionState<SyncCourseworkFormState | undefined, FormData>(
    boundAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Syncing..." : "Sync Coursework Milestone"}
      </button>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>}
    </form>
  );
}
