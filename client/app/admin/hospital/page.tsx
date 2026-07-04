"use client";

/**
 * PAGE 9 — Hospital Admin Dashboard (Hospital Admin role).
 *
 * For now, picks the first verified hospital as the "logged-in admin's"
 * hospital — replace with real auth claims once the JWT flow is wired.
 *
 * Layout: left sidebar (admin nav) + main column. Main column:
 *   - Header (hospital name + role badge)
 *   - Stale-data banner
 *   - 4 status cards (ICU/NICU/CCU/HDU availability)
 *   - Quick update widget + Recent log + Public preview (3-col grid)
 */

import { useMemo } from "react";
import Link from "next/link";
import { IconActivity, IconShieldCheck } from "@tabler/icons-react";
import { AdminSidebar } from "@/components/hospital-admin/admin-sidebar";
import { StaleDataBanner } from "@/components/hospital-admin/stale-data-banner";
import { QuickUpdateWidget } from "@/components/hospital-admin/quick-update-widget";
import { RecentUpdateLog } from "@/components/hospital-admin/recent-update-log";
import { PublicPreviewCard } from "@/components/hospital-admin/public-preview-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHospitalStore } from "@/lib/use-hospital-store";
import { availabilityColor, getAvailabilityClass } from "@/lib/hospital-utils";
import {
  ALL_BED_TYPES,
  type BedType,
} from "@/lib/types/hospital";

const LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

const FULL: Record<BedType, string> = {
  icu: "Intensive Care Unit",
  nicu: "Neonatal ICU",
  ccu: "Coronary Care Unit",
  hdu: "High Dependency Unit",
};

export default function HospitalAdminDashboard() {
  const { hospitals } = useHospitalStore();

  // Until auth is wired, scope the dashboard to the first verified hospital.
  const hospital = useMemo(
    () => hospitals.find((h) => h.verified) ?? hospitals[0],
    [hospitals],
  );

  if (!hospital) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No hospital linked to this account yet.
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] bg-muted/20">
      <div className="hidden md:block">
        <AdminSidebar hospital={hospital} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b bg-card px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h1 className="font-heading text-xl font-semibold tracking-tight">
                Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">
                Welcome back. Here’s the latest snapshot of {hospital.name}.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-niramoy-teal/10 px-2 py-0.5 text-[10px] font-semibold text-niramoy-teal">
              <IconShieldCheck className="size-3" />
              Hospital Admin
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4 p-4 sm:p-6">
          <StaleDataBanner lastUpdated={hospital.last_updated} />

          {/* 4 status cards */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_BED_TYPES.map((t) => {
              const { total, available } = hospital.beds[t];
              const cls = getAvailabilityClass(hospital, t);
              const color = availabilityColor(cls);
              return (
                <Card key={t} size="sm">
                  <CardContent className="space-y-1.5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-xs font-semibold text-foreground">
                        {LABEL[t]} available
                      </span>
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="font-heading text-2xl font-semibold tabular-nums"
                        style={{ color }}
                      >
                        {total === 0 ? "—" : available}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        / {total}
                      </span>
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {FULL[t]}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-6 w-full px-2 text-[11px]"
                    >
                      <Link href="/admin/hospital/bed-counts">
                        <IconActivity className="size-3" />
                        Update Now
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Two-column row: quick update + public preview */}
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <QuickUpdateWidget hospital={hospital} />
            <PublicPreviewCard hospital={hospital} />
          </div>

          <RecentUpdateLog hospital={hospital} />
        </div>
      </div>
    </div>
  );
}
