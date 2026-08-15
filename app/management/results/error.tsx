"use client";

import { ManagementErrorFallback } from "@/app/management/_components/error-fallback";

export default function ResultsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ManagementErrorFallback error={error} retry={retry} moduleName="Results" />;
}
