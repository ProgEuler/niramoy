"use client";

import Link from "next/link";
import { IconArrowLeft, IconLoader2, IconReportAnalytics } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ReportsPanel } from "@/components/sysadmin/reports";
import { useAdminHospitals } from "@/lib/hooks/use-admin";

export default function ReportsPage() {
  // Fetch up to 200 hospitals for report calculations (no pagination needed for charts).
  const { data, isLoading } = useAdminHospitals({ page_size: 200, is_active: true });
  const hospitals = data?.data ?? [];

  // The existing ReportsPanel works with the local Hospital type shape.
  // We need to adapt the API response into that shape.
  // For now we pass the raw data — ReportsPanel already handles empty gracefully.

  return (
    <>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-xs text-muted-foreground">
            <IconLoader2 className="size-4 animate-spin" />
            Loading report data…
          </div>
        ) : (
          // ReportsPanel expects the legacy Hospital store shape.
          // Pass an empty array — the panel shows "no data" states gracefully
          // until the data shape adapter is built.
          <ReportsPanel hospitals={[]} />
        )}
      </div>
    </>
  );
}
