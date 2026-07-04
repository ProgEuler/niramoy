"use client";

/**
 * Stale-data banner shown above the dashboard. Green if updated within the
 * last 6 hours ("Last updated 2 hours ago"), yellow otherwise.
 */

import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { formatRelativeTime } from "@/lib/hospital-utils";

const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000;

interface Props {
  lastUpdated: string;
  now?: number;
}

export function StaleDataBanner({ lastUpdated, now = Date.now() }: Props) {
  const ageMs = now - new Date(lastUpdated).getTime();
  const isStale = ageMs > STALE_THRESHOLD_MS;

  if (isStale) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
      >
        <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <div className="flex-1 text-xs">
          <div className="font-semibold text-amber-700 dark:text-amber-400">
            Your bed counts may be outdated.
          </div>
          <div className="text-amber-700/80 dark:text-amber-400/80">
            Last updated {formatRelativeTime(lastUpdated, now)}. Patients rely
            on accurate availability — please update now.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs"
    >
      <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
        <IconCheck className="size-3.5" />
      </span>
      <div className="flex-1">
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          Bed counts look fresh.
        </span>{" "}
        <span className="text-emerald-700/80 dark:text-emerald-400/80">
          Last updated {formatRelativeTime(lastUpdated, now)}.
        </span>
      </div>
    </div>
  );
}
