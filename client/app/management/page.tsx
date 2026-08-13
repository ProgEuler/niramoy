"use client";

/**
 * PAGE 1 — Hospital Admin Dashboard.
 *
 * Everything the admin needs to see at a glance after login:
 *   - 4 bed-count cards (ICU / NICU / CCU / HDU) with color coding
 *   - Stale-data banner if last update is > 6h ago
 *   - Quick-update widget (spinners inline)
 *   - Last updated timestamp + who made the last update
 *   - Last 5 changes log
 *   - Public-profile preview card (links out to the live public page)
 *   - Pending-approval notification if any submitted updates await system admin review
 *
 * Hospital is resolved from the auth store's `hospitalId`. Until the real
 * auth claim is wired up end-to-end, we fall back to the first verified
 * hospital in the seed data so the UI is exercisable.
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  IconActivity,
  IconClock,
  IconShieldCheck,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaleDataBanner } from "@/components/hospital-admin/stale-data-banner";
import { QuickUpdateWidget } from "@/components/hospital-admin/quick-update-widget";
import { RecentUpdateLog } from "@/components/hospital-admin/recent-update-log";
import { PublicPreviewCard } from "@/components/hospital-admin/public-preview-card";
import { useHospitalStore } from "@/lib/use-hospital-store";
import { useAuth } from "@/lib/auth/use-auth";
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
  const { hospitals } = useHospitalStore();
  const { user } = useAuth();

  // Try to scope to the signed-in admin's hospital; fall back to the first
  // verified entry (and then the very first entry) so the UI is still useful
  // when auth isn't wired all the way through yet.
  const hospital = useMemo(() => {
    if (user?.hospital_id != null) {
      const byId = hospitals.find(
        (h) => String(h.id) === String(user.hospital_id),
      );
      if (byId) return byId;
    }
    return hospitals.find((h) => h.verified) ?? hospitals[0];
  }, [hospitals, user]);

  // Synthetic pending-approval flag. In production this would come from the
  // moderation queue endpoint; surfaced here so the admin sees whether any of
  // their recent submissions are sitting in front of the system admin.
  const hasPendingUpdates = useMemo(() => {
    if (!hospital) return false;
    // Stable hash → boolean, same convention used elsewhere in the portal.
    let h = 0;
    for (let i = 0; i < hospital.id.length; i += 1) {
      h = (h ^ hospital.id.charCodeAt(i) * 2654435761) >>> 0;
    }
    return ((h >>> 0) % 4) === 0;
  }, [hospital]);

  if (!hospital) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No hospital linked to this account yet.
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-muted/20">
      <div className="border-b bg-card px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              Welcome back. Here&rsquo;s the latest snapshot of {hospital.name}.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-niramoy-teal/10 px-2 py-0.5 text-[10px] font-semibold text-niramoy-teal">
            <IconShieldCheck className="size-3" />
            Hospital Admin
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-4 sm:p-6">
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

        {/* Quick update widget + public preview */}
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <QuickUpdateWidget hospital={hospital} />
          <PublicPreviewCard hospital={hospital} />
        </div>

        {/* Last updated by / when */}
        <Card>
          <CardContent className="flex items-center gap-2 p-3 text-[11px] text-muted-foreground">
            <IconClock className="size-3.5 text-niramoy-teal" />
            <span>
              Last updated{" "}
              <span className="font-semibold text-foreground">
                {formatRelativeTime(hospital.last_updated)}
              </span>
              {" "}by{" "}
              <span className="font-semibold text-foreground">
                {user?.username ?? "Admin"}
              </span>
              .
            </span>
          </CardContent>
        </Card>

        <RecentUpdateLog hospital={hospital} />
      </div>
    </div>
  );
}
