"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBuildingHospital,
  IconClock,
  IconShieldCheck,
  IconShieldCog,
  IconShieldOff,
  IconStethoscope,
} from "@tabler/icons-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  useAdminHospitals,
  useAdminStats,
  useAvailabilitySummary,
  useUpdateFrequency,
  useVerifyHospital,
} from "@/lib/hooks/use-admin";
import { formatRelativeTime } from "@/lib/hospital-utils";

const TEAL = "var(--chart-1, #0E9E8E)";
const AMBER = "var(--chart-2, #F59E0B)";
const ROSE = "var(--chart-3, #E11D48)";
const SKY = "var(--chart-4, #0EA5E9)";
const MUTED = "var(--muted-foreground)";

const hospitalStatusConfig: ChartConfig = {
  verified: { label: "Verified", color: TEAL },
  pending: { label: "Pending", color: AMBER },
  suspended: { label: "Suspended", color: ROSE },
};

const icuConfig: ChartConfig = {
  available: { label: "Available", color: TEAL },
  occupied: { label: "Occupied", color: ROSE },
};

const bedTrendConfig: ChartConfig = {
  icu: { label: "ICU", color: TEAL },
  nicu: { label: "NICU", color: SKY },
};

const updateFreqConfig: ChartConfig = {
  updates: { label: "Updates", color: TEAL },
};

export default function SysAdminPage() {
  const statsQuery = useAdminStats();
  const pendingQuery = useAdminHospitals({ is_verified: false, is_active: true, page_size: 5 });
  const staleQuery = useAdminHospitals({ is_verified: true, is_active: true, page_size: 100 });
  const availSummaryQuery = useAvailabilitySummary("icu");
  const updateFreqQuery = useUpdateFrequency();
  const verify = useVerifyHospital();

  const s = statsQuery.data;

  const donutData = useMemo(() => {
    if (!s) return [];
    const suspended = Math.max(0, s.total_hospitals - (s.verified_hospitals + (s.total_hospitals - s.verified_hospitals)));
    return [
      { name: "Verified", value: s.verified_hospitals, fill: TEAL },
      { name: "Pending", value: Math.max(0, s.total_hospitals - s.verified_hospitals), fill: AMBER },
    ].filter((d) => d.value > 0);
  }, [s]);

  const icuPct = s && s.total_icu_beds > 0
    ? Math.round((s.available_icu_beds / s.total_icu_beds) * 100)
    : 0;
  const radialData = [
    { name: "Available", value: icuPct, fill: TEAL },
    { name: "Occupied", value: 100 - icuPct, fill: "var(--muted)" },
  ];

  const districtData = useMemo(() => {
    return (availSummaryQuery.data ?? [])
      .filter((r) => r.total_beds > 0)
      .sort((a, b) => b.available_beds - a.available_beds)
      .slice(0, 10)
      .map((r) => ({
        district: r.district_name.length > 10
          ? r.district_name.slice(0, 10) + "…"
          : r.district_name,
        available: r.available_beds,
        occupied: r.total_beds - r.available_beds,
      }));
  }, [availSummaryQuery.data]);

  const freqData = useMemo(() => {
    return (updateFreqQuery.data ?? [])
      .slice(0, 8)
      .map((r) => ({
        name: r.hospital_name.length > 14
          ? r.hospital_name.slice(0, 14) + "…"
          : r.hospital_name,
        updates: r.update_count,
      }));
  }, [updateFreqQuery.data]);

  const staleList = useMemo(
    () =>
      (staleQuery.data?.data ?? [])
        .filter((h) => !h.last_updated || Date.now() - new Date(h.last_updated).getTime() > 24 * 60 * 60 * 1000)
        .sort((a, b) => (a.last_updated ?? "").localeCompare(b.last_updated ?? ""))
        .slice(0, 5),
    [staleQuery.data],
  );

  return (
    <>
      <div className="flex-1 space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile
            label="Total hospitals"
            value={s?.total_hospitals ?? "—"}
            icon={<IconBuildingHospital className="size-3.5" />}
            href="/admin/hospitals"
          />
          <KpiTile
            label="ICU beds"
            value={s ? `${s.available_icu_beds} / ${s.total_icu_beds}` : "—"}
            icon={<IconStethoscope className="size-3.5" />}
            sub="available"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Donut — hospital status */}
          <Card className="xl:col-span-2">
            <CardContent className="p-4">
              <p className="mb-3 font-heading text-sm font-semibold text-foreground">
                Hospital status
              </p>
              {statsQuery.isLoading ? (
                <ChartSkeleton />
              ) : (
                <ChartContainer config={hospitalStatusConfig} className="h-[200px]">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} strokeWidth={0} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  </PieChart>
                </ChartContainer>
              )}
              {/* Legend */}
              {!statsQuery.isLoading && (
                <div className="mt-3 flex flex-wrap justify-center gap-3">
                  {donutData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                      <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold tabular-nums text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Radial — ICU utilisation */}
          <Card className="xl:col-span-2">
            <CardContent className="p-4">
              <p className="mb-3 font-heading text-sm font-semibold text-foreground">
                ICU bed availability
              </p>
              {statsQuery.isLoading ? (
                <ChartSkeleton />
              ) : (
                <div className="flex items-center justify-center gap-8">
                  <ChartContainer config={icuConfig} className="h-[200px] w-[200px]">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                      data={radialData}
                    >
                      <RadialBar dataKey="value" background={{ fill: "var(--muted)" }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RadialBarChart>
                  </ChartContainer>
                  <div className="text-center">
                    <p className="font-heading text-4xl font-bold tabular-nums text-niramoy-teal">
                      {icuPct}%
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">available</p>
                    <p className="mt-2 font-heading text-xl font-semibold tabular-nums text-foreground">
                      {s?.available_icu_beds ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">of {s?.total_icu_beds ?? 0} beds</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {/* Bar — ICU availability by district */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="font-heading text-sm font-semibold text-foreground">
                  ICU availability by district
                </p>
                <span className="text-[10px] text-muted-foreground">top 10</span>
              </div>
              {availSummaryQuery.isLoading ? (
                <ChartSkeleton />
              ) : districtData.length === 0 ? (
                <EmptyChart />
              ) : (
                <ChartContainer config={icuConfig} className="h-[240px]">
                  <BarChart data={districtData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="district"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="available" stackId="a" fill={TEAL} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="occupied" stackId="a" fill={ROSE} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
              <div className="mt-2 flex gap-4">
                <LegendDot color={TEAL} label="Available" />
                <LegendDot color={ROSE} label="Occupied" />
              </div>
            </CardContent>
          </Card>

          {/* Bar — update frequency per hospital */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="font-heading text-sm font-semibold text-foreground">
                  Most active hospitals
                </p>
                <span className="text-[10px] text-muted-foreground">by update count</span>
              </div>
              {updateFreqQuery.isLoading ? (
                <ChartSkeleton />
              ) : freqData.length === 0 ? (
                <EmptyChart />
              ) : (
                <ChartContainer config={updateFreqConfig} className="h-[240px]">
                  <BarChart
                    data={freqData}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="updates" fill={TEAL} radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
                  <IconClock className="size-4 text-amber-500" />
                  Awaiting approval
                </h2>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link href="/admin/pending">View all</Link>
                </Button>
              </div>
              {pendingQuery.isLoading ? (
                <Skeleton rows={3} />
              ) : (pendingQuery.data?.data ?? []).length === 0 ? (
                <EmptyState icon={<IconShieldCheck className="size-5" />} label="No pending hospitals" />
              ) : (
                <ul className="space-y-1.5">
                  {(pendingQuery.data?.data ?? []).map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{h.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {h.district}{h.division ? `, ${h.division}` : ""} · {formatRelativeTime(h.created_at)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 shrink-0 gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
                        disabled={verify.isPending}
                        onClick={() => verify.mutate({ id: h.id, is_verified: true })}
                      >
                        <IconShieldCheck className="size-3" />
                        Approve
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
                <IconAlertTriangle className="size-4 text-destructive" />
                Stale data (&gt;24 h)
              </h2>
              {staleQuery.isLoading ? (
                <Skeleton rows={3} />
              ) : staleList.length === 0 ? (
                <EmptyState icon={<IconShieldCheck className="size-5" />} label="All hospitals up to date" />
              ) : (
                <ul className="space-y-1.5">
                  {staleList.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{h.name}</p>
                        <p className="text-[10px] text-destructive">
                          {h.last_updated ? formatRelativeTime(h.last_updated) : "never updated"}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="h-7 shrink-0">
                        <Link href={`/hospital/${h.id}`}>View</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function KpiTile({
  label,
  value,
  icon,
  accent,
  href,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  href?: string;
  sub?: string;
}) {
  const inner = (
    <Card className={href ? "transition-shadow hover:shadow-md" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className={`mt-1 font-heading text-2xl font-bold tabular-nums ${accent ?? "text-foreground"}`}>
          {value}
        </div>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-[200px] animate-pulse rounded-md bg-muted" />;
}

function EmptyChart() {
  return (
    <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
      No data yet
    </div>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="h-10 animate-pulse rounded-md bg-muted" />
      ))}
    </ul>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-dashed bg-muted/30 py-6 text-center text-xs text-muted-foreground">
      <span className="opacity-40">{icon}</span>
      <p>{label}</p>
    </div>
  );
}
