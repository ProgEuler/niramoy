"use client";

/**
 * Hospital detail "Availability" charts.
 *
 * Two stacked cards matching the management dashboard's `DashboardCharts`:
 *
 *   1. **Bed occupancy** — vertical stacked bar chart per bed type showing
 *      occupied vs available. Reads directly from `hospital.beds`.
 *
 *   2. **Activity (7 days)** — line chart of update-history counts per day
 *      sourced from the `availability_trend` array on the detail payload
 *      (populated server-side from `UpdateHistory`). Always length 7
 *      (oldest → today); days with no updates have `count: 0`.
 *
 * Both charts use the shadcn `<ChartContainer>` wrapper so tooltips,
 * colors, and legend styling match the rest of the design system.
 */

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { HospitalDetail } from "@/lib/api/hospitals";
import type { Hospital } from "@/lib/types/hospital";
import { ALL_BED_TYPES, type BedType } from "@/lib/types/hospital";

const LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

const occupancyConfig: ChartConfig = {
  available: {
    label: "Available",
    color: "#10b981",
  },
  occupied: {
    label: "Occupied",
    color: "#f97316",
  },
};

const activityConfig: ChartConfig = {
  updates: {
    label: "Updates",
    color: "#0d9488",
  },
};

interface Props {
  /** Mapped UI hospital — used for the bed occupancy snapshot. */
  hospital: Hospital;
  /** Raw backend payload, only needed for `availability_trend`. Undefined
   *  for legacy seed slugs; the activity chart falls back to a skeleton. */
  detail: HospitalDetail | undefined;
}

export function AvailabilityHistoryChart({ hospital, detail }: Props) {
  // Bed occupancy snapshot — straight off the mapped `hospital.beds`.
  const occupancy = useMemo(
    () =>
      ALL_BED_TYPES.map((t) => {
        const { total, available } = hospital.beds[t];
        return {
          type: LABEL[t],
          total,
          available,
          occupied: Math.max(0, total - available),
        };
      }),
    [hospital.beds],
  );

  // Activity — server already gives us a length-7 chronological array.
  // Just re-format the ISO `date` into the "Mar 14" form Recharts wants.
  const activity = useMemo(() => {
    const trend = detail?.availability_trend ?? [];
    return trend.map((p) => {
      const d = new Date(p.date);
      const label = Number.isFinite(d.getTime())
        ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : p.date;
      return {
        date: label,
        iso: p.date,
        updates: p.count,
      };
    });
  }, [detail]);

  const totalActivity = activity.reduce((acc, d) => acc + d.updates, 0);
  const hasTrend =
    !!detail && Array.isArray(detail.availability_trend) &&
    detail.availability_trend.length > 0;

  return (
    <section aria-labelledby="history-heading" className="space-y-3">
      <div>
        <h2
          id="history-heading"
          className="font-heading text-sm font-semibold text-foreground sm:text-base"
        >
          Availability
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Current bed occupancy plus how often this hospital updates its data.
        </p>
      </div>

      {/* Bed occupancy */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Bed occupancy
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Available vs occupied per bed type.
              </p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Live
            </span>
          </div>

          <ChartContainer
            config={occupancyConfig}
            className="h-44 w-full"
          >
            <BarChart
              data={occupancy}
              layout="vertical"
              margin={{ left: 4, right: 8, top: 4, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="type"
                width={42}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    indicator="dashed"
                    formatter={(value, name) => (
                      <span className="ml-auto tabular-nums">
                        {Number(value).toLocaleString()} {name}
                      </span>
                    )}
                  />
                }
              />
              <Bar
                dataKey="occupied"
                stackId="beds"
                fill="var(--color-occupied)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="available"
                stackId="beds"
                fill="var(--color-available)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Activity (7 days) */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Activity
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Update history over the last 7 days.
              </p>
            </div>
            {hasTrend && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                {totalActivity} total
              </span>
            )}
          </div>

          {!hasTrend ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <ChartContainer config={activityConfig} className="h-44 w-full">
              <LineChart
                data={activity}
                margin={{ left: 0, right: 8, top: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  allowDecimals={false}
                  width={20}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideIndicator />}
                />
                <Line
                  type="monotone"
                  dataKey="updates"
                  stroke="var(--color-updates)"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 1.5, fill: "#fff" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </section>
  );
}