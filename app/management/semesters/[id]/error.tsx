"use client";

import { ManagementErrorFallback } from "@/app/management/_components/error-fallback";

export default function SemesterDetailError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ManagementErrorFallback error={error} retry={retry} moduleName="Semester Detail" />;
}
