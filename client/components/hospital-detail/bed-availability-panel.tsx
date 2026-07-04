"use client";

/**
 * Page-3 "Live Bed Availability" panel. Four cards (ICU / NICU / CCU / HDU)
 * with available/total, color progress bar, cost per day, and a
 * "Last updated X ago" timestamp.
 *
 * Real-time: the data flows through useHospitalStore. The component ticks a
 * "now" state every 30s so relative timestamps update without page reloads
 * — SignalR can hook into the same store when it lands.
 */

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconClock, IconRadio } from "@tabler/icons-react";
import {
  availabilityColor,
  formatRelativeTime,
  formatTaka,
  getAvailabilityClass,
} from "@/lib/hospital-utils";
import type { Hospital } from "@/lib/types/hospital";
import { ALL_BED_TYPES } from "@/lib/types/hospital";

interface Props {
  hospital: Hospital;
}

const LABEL: Record<string, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

const FULL: Record<string, string> = {
  icu: "Intensive Care Unit",
  nicu: "Neonatal ICU",
  ccu: "Coronary Care Unit",
  hdu: "High Dependency Unit",
};

const REFRESH_MS = 30_000;

export function BedAvailabilityPanel({ hospital }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section aria-labelledby="beds-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="beds-heading"
          className="font-heading text-sm font-semibold text-foreground sm:text-base"
        >
          Live bed availability
        </h2>
        <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-[#22c55e]" />
          </span>
          <IconRadio className="size-2.5" />
          <span>Live · updates as hospital changes data</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ALL_BED_TYPES.map((t) => {
          const { total, available } = hospital.beds[t];
          const cls = getAvailabilityClass(hospital, t);
          const color = availabilityColor(cls);
          const pct = total > 0 ? Math.round((available / total) * 100) : 0;
          const isFree = total === 0;

          return (
            <Card key={t} size="sm" className="overflow-hidden">
              <CardContent className="space-y-2 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <div className="font-heading text-base font-semibold text-foreground">
                      {LABEL[t]}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {FULL[t]}
                    </div>
                  </div>
                  {!isFree && (
                    <Badge
                      className="text-[10px]"
                      style={{
                        backgroundColor: color,
                        color: "white",
                      }}
                    >
                      {pct}% free
                    </Badge>
                  )}
                </div>

                {/* Progress bar */}
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={available}
                  aria-label={`${LABEL[t]} availability`}
                >
                  {!isFree && (
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  )}
                </div>

                <div className="flex items-baseline justify-between">
                  {isFree ? (
                    <span className="text-xs text-muted-foreground">
                      Not offered
                    </span>
                  ) : (
                    <span className="text-2xl font-semibold tabular-nums text-foreground">
                      {available}
                      <span className="text-xs text-muted-foreground">/{total}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between border-t pt-1.5 text-[11px]">
                  <span className="text-muted-foreground">Cost / day</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {hospital.price[t] === 0
                      ? "Free"
                      : formatTaka(hospital.price[t])}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
        <IconClock className="size-3" />
        Last updated {formatRelativeTime(hospital.last_updated)}.
      </p>
    </section>
  );
}
