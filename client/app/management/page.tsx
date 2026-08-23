"use client";

import Link from "next/link";
import {
  IconActivity,
  IconClock,
  IconShieldCheck,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MyHospitalData } from "@/components/hospital-admin/my-hospital-data";
import { StaleDataBanner } from "@/components/hospital-admin/stale-data-banner";
import { DashboardCharts } from "@/components/hospital-admin/dashboard-charts";
import { RecentUpdateLog } from "@/components/hospital-admin/recent-update-log";
import { PublicPreviewCard } from "@/components/hospital-admin/public-preview-card";
import { formatRelativeTime } from "@/lib/hospital-utils";
import {
  availabilityColor,
  getAvailabilityClass,
} from "@/lib/hospital-utils";
import { ALL_BED_TYPES, type BedType } from "@/lib/types/hospital";

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

export default function ManagementDashboardPage() {
  // Synthetic pending-approval flag. In production this would come from the
  // moderation queue endpoint; surfaced here so the admin sees whether any of
  // their recent submissions are sitting in front of the system admin.
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-muted/20">
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <MyHospitalData>
          {(hospital) => {
            let h = 0;
            for (let i = 0; i < hospital.id.length; i += 1) {
              h = (h ^ hospital.id.charCodeAt(i) * 2654435761) >>> 0;
            }
            const hasPendingUpdates = ((h >>> 0) % 4) === 0;

            return (
              <>
                {hasPendingUpdates && (
                  <div
                    role="status"
                    className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 font-bold text-amber-700 dark:text-amber-400">
                      !
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-amber-700 dark:text-amber-400">
                        You have updates awaiting platform admin review.
                      </div>
                      <div className="text-amber-700/80 dark:text-amber-400/80">
                        These changes won&rsquo;t go live on the public site until the
                        platform administrator approves them.{" "}
                        <Link
                          href="/management/history"
                          className="underline underline-offset-2 hover:no-underline"
                        >
                          See pending updates
                        </Link>
                        .
                      </div>
                    </div>
                  </div>
                )}

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
                            <span className="font-heading text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {LABEL[t]}
                            </span>
                            <span
                              className="inline-block size-2 rounded-full"
                              style={{ backgroundColor: color }}
                              aria-hidden
                            />
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span
                              className="font-heading text-5xl font-bold leading-none tabular-nums"
                              style={{ color }}
                            >
                              {total === 0 ? "—" : available}
                            </span>
                            <span className="text-sm font-medium text-muted-foreground tabular-nums">
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
                            <Link href="/management/bed-counts">
                              <IconActivity className="size-3" />
                              Update Now
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Charts + public preview */}
                <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                  <DashboardCharts hospital={hospital} />
                  <PublicPreviewCard hospital={hospital} />
                </div>

                {/* Last updated by / when */}
                <CardContent className="flex items-center gap-2 p-3 text-[11px] text-muted-foreground">
                  <IconClock className="size-3.5 text-niramoy-teal" />
                  <span>
                    Last updated{" "}
                    <span className="font-semibold text-foreground">
                      {formatRelativeTime(hospital.last_updated)}
                    </span>
                    {" "}by{" "}
                    <span className="font-semibold text-foreground">
                      Admin
                    </span>
                    .
                  </span>
                </CardContent>

                <RecentUpdateLog hospital={hospital} />
              </>
            );
          }}
        </MyHospitalData>
      </div>
    </div>
  );
}
