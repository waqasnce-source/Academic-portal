"use client";

import { ManagementErrorFallback } from "@/app/management/_components/error-fallback";

export default function EditStudentError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ManagementErrorFallback error={error} retry={retry} moduleName="Edit Student" />;
}
