"use client";

/**
 * PAGE 6 — Reports & Analytics (system admin).
 *
 * Five report sections stacked vertically:
 *   1. District-wise Availability Summary
 *   2. National Availability Trend
 *   3. Hospital Update Frequency
 *   4. Bed Occupancy by Division (choropleth)
 *   5. Review Volume by Hospital
 *
 * All five share the date-range picker at the top. CSV + PDF export per
 * section. The seeded hospital dataset is the source until a real
 * time-series endpoint is wired in.
 */

import { IconLoader2, IconReportAnalytics } from "@tabler/icons-react";
import { ReportsPanel } from "@/components/sysadmin/reports";
import { useHospitalStore } from "@/lib/use-hospital-store";

export default function ReportsPage() {
  const { hospitals } = useHospitalStore();

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Reports
        </h1>
        <p className="text-xs text-muted-foreground">
          Platform analytics across {hospitals.length} hospital
          {hospitals.length !== 1 ? "s" : ""}.
        </p>
      </div>

      <ReportsPanel hospitals={hospitals} />
    </div>
  );
}