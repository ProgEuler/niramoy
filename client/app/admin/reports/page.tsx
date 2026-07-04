"use client";

import Link from "next/link";
import { IconArrowLeft, IconReportAnalytics } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ReportsPanel } from "@/components/sysadmin/reports";
import { useHospitalStore } from "@/lib/use-hospital-store";

export default function ReportsPage() {
  const { hospitals } = useHospitalStore();

  return (
    <>
      <div className="border-b bg-card px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="inline-flex items-center gap-1 rounded-full bg-niramoy-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-niramoy-teal">
              <IconReportAnalytics className="size-3" />
              Reports & Analytics
            </p>
            <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight">
              Platform insights
            </h1>
            <p className="text-xs text-muted-foreground">
              Drill into ICU availability, occupancy, update frequency, and
              review volume.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin">
              <IconArrowLeft className="size-3.5" />
              Back to overview
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <ReportsPanel hospitals={hospitals} />
      </div>
    </>
  );
}