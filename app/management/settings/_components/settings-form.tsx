"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { updateSystemSettings, type UpdateSettingsState } from "../actions";
import type { SystemSettings } from "@/lib/management/settings";

const initialState: UpdateSettingsState = {};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SettingsForm({ settings }: { settings: SystemSettings }) {
  const [state, formAction, pending] = useActionState(updateSystemSettings, initialState);

  return (
    <form
      action={formAction}
      className="max-w-lg space-y-5 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="space-y-1">
        <label htmlFor="minimum_attendance_percentage" className={labelClasses}>
          Minimum attendance percentage
        </label>
        <div className="flex items-center gap-2">
          <input
            id="minimum_attendance_percentage"
            name="minimum_attendance_percentage"
            type="number"
            min={0}
            max={100}
            step="0.01"
            defaultValue={settings.minimumAttendancePercentage}
            required
            className={`${fieldClasses} w-32`}
          />
          <span className="text-sm text-slate-500 dark:text-slate-400">%</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Used by attendance reporting to flag low attendance. Must be between 0 and 100.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="institution_timezone" className={labelClasses}>
          Institution timezone
        </label>
        <input
          id="institution_timezone"
          name="institution_timezone"
          type="text"
          defaultValue={settings.institutionTimezone}
          placeholder="e.g. Asia/Karachi"
          required
          className={fieldClasses}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Must be a valid IANA timezone identifier (e.g. &ldquo;Asia/Karachi&rdquo;, &ldquo;UTC&rdquo;).
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Settings saved.</p>
      )}

      <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Last updated {formatDateTime(settings.updatedAt)}
          {settings.updatedByName ? ` by ${settings.updatedByName}` : ""}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
