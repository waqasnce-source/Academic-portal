/** Shared inline query-error banner for modules built from Semesters onward. */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
      {message}
    </div>
  );
}
