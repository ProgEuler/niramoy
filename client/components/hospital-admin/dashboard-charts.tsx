"use client";

/**
 * Two compact charts that replace the old quick-update widget on the
 * management dashboard.
 *
 *   1. **Bed occupancy** — stacked-bar per bed type showing total vs.
 *      available. Reads directly from the `hospital.beds` snapshot the
 *      page already has. No extra fetch.
 *
 *   2. **Activity (7 days)** — area chart of how many update-history
 *      rows the admin created per day for the past week. Fetches
 *      `GET /api/hospital/history?update_type=BedCount&page_size=200`
 *      so a busy week isn't truncated, then groups rows by ISO date
 *      client-side.
 *
 * Both charts use the shadcn `<ChartContainer>` wrapper so they pick up
 * the same tooltip/legend styling as the rest of the design system.
 */

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
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
import { useMyHospitalHistory } from "@/lib/hooks/use-my-hospital";
import { ALL_BED_TYPES, type BedType, type Hospital } from "@/lib/types/hospital";

const LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

const OCCUPANCY_COLORS = {
  available: "var(--color-available)",
  occupied: "var(--color-occupied)",
} as const;

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
  hospital: Hospital;
}

/**
 * Build the past-7-days bucket array (oldest → today) for the activity
 * chart. Each entry is `{ date: "Mar 14", updates: 0, iso: "2025-03-14" }`.
 * Hours are zeroed out of the ISO so the bucket key is day-granular
 * regardless of timezone offset.
 */
function buildActivityBuckets(
  rows: { created_at: string }[],
): { date: string; iso: string; updates: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { date: string; iso: string; updates: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      iso,
      updates: 0,
    });
  }

  const indexByIso = new Map(days.map((d, i) => [d.iso, i]));
  for (const row of rows) {
    const iso = new Date(row.created_at);
    if (Number.isNaN(iso.getTime())) continue;
    iso.setHours(0, 0, 0, 0);
    const key = iso.toISOString().slice(0, 10);
    const bucket = indexByIso.get(key);
    if (bucket !== undefined) days[bucket].updates += 1;
  }

  return days;
}

export function DashboardCharts({ hospital }: Props) {
  // Pull enough history rows to cover a busy week. BedCount updates are
  // the most common admin action, so this gives a representative signal
  // without overfetching.
  const { rows, isLoading, isError } = useMyHospitalHistory({
    update_type: "BedCount",
    page_size: 200,
  });

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

  const activity = useMemo(() => buildActivityBuckets(rows), [rows]);

  const totalActivity = activity.reduce((acc, d) => acc + d.updates, 0);

  return (
    <div className="space-y-3">
      {/* Bed occupancy — current snapshot, no fetch. */}
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
                fill={OCCUPANCY_COLORS.occupied}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="available"
                stackId="beds"
                fill={OCCUPANCY_COLORS.available}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Activity — 7-day update frequency from the audit log. */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Activity
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Bed-count updates over the last 7 days.
              </p>
            </div>
            {!isLoading && !isError && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                {totalActivity} total
              </span>
            )}
          </div>

          {isLoading ? (
            <Skeleton className="h-44 w-full" />
          ) : isError ? (
            <div className="flex h-44 items-center justify-center text-[11px] text-muted-foreground">
              Couldn't load update history.
            </div>
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
    </div>
  );
}