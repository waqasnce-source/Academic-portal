/** Shared filter-form field styling for modules built from Semesters onward. */
/**
 * `bg-transparent` used to leave `<select>` dropdown popups with a browser-
 * default white listbox while still inheriting `dark:text-slate-50` white
 * text — invisible options in dark mode except the OS-highlighted one.
 * An explicit opaque background (matching the card surface every one of
 * these fields already sits on) fixes the popup in both themes.
 */
export const fieldClasses =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50";
export const labelClasses = "text-xs font-medium text-slate-500 dark:text-slate-400";
