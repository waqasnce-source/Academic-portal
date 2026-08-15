"use client";

import { ManagementErrorFallback } from "@/app/management/_components/error-fallback";

export default function AttendanceRateError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ManagementErrorFallback error={error} retry={retry} moduleName="Attendance Rate Report" />;
}
