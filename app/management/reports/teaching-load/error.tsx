"use client";

import { ManagementErrorFallback } from "@/app/management/_components/error-fallback";

export default function TeachingLoadError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ManagementErrorFallback error={error} retry={retry} moduleName="Faculty Teaching Load Report" />;
}
