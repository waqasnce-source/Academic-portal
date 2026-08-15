"use client";

import { ManagementErrorFallback } from "@/app/management/_components/error-fallback";

export default function StudentDashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ManagementErrorFallback error={error} retry={retry} moduleName="Student Dashboard" />;
}
