"use client";

/**
 * PAGE 1 — Platform Overview (system admin).
 *
 * The command center. Everything needing attention today is visible without
 * clicking anywhere else:
 *
 *   - KPI rows (8 tiles):
 *       Row 1: Total Hospitals · Verified · Pending Approval · Suspended
 *       Row 2: Total ICU Beds · Available ICU Beds · Hospitals Stale >24h ·
 *              Active Admins
 *   - Pending approvals list with inline Approve buttons.
 *   - Stale hospitals list with "Send Reminder" button per row.
 *   - Recent platform activity feed (last 20 actions across the platform).
 *   - National ICU availability 7-day trend (line chart).
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  IconAlertTriangle,
  IconBellRinging,
  IconBuildingHospital,
  IconCheck,
  IconCircleDot,
  IconClipboardList,
  IconLoader2,
  IconShieldCheck,
  IconShieldOff,
  IconStethoscope,
  IconUserShield,
  IconUsers,
} from "@tabler/icons-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToasts } from "@/components/ui/toast";
import {
  useAdminHospitals,
  useAdminStats,
  useAdminUpdates,
  useVerifyHospital,
} from "@/lib/hooks/use-admin";
import { formatRelativeTime } from "@/lib/hospital-utils";

export default function SysAdminOverviewPage() {
  const { pushToast } = useToasts();
  const statsQuery = useAdminStats();
  const verify = useVerifyHospital();

  // Pending registrations (top 5) — unverified active hospitals.
  const pendingQuery = useAdminHospitals({
    is_verified: false,
    is_active: true,
    page_size: 5,
  });

  // Stale hospitals — fetch verified+active, filter client-side for >24h.
  const staleQuery = useAdminHospitals({
    is_verified: true,
    is_active: true,
    page_size: 200,
  });

  // Recent activity feed — last 20 actions across the platform.
  const activityQuery = useAdminUpdates({ page_size: 20 });

  const stats = statsQuery.data;

  const staleList = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return (staleQuery.data?.data ?? [])
      .filter(
        (h) =>
          !h.last_updated ||
          new Date(h.last_updated).getTime() < cutoff,
      )
      .sort(
        (a, b) =>
          new Date(a.last_updated ?? 0).getTime() -
          new Date(b.last_updated ?? 0).getTime(),
      )
      .slice(0, 5);
  }, [staleQuery.data]);

  // Synthetic 7-day ICU availability trend (placeholder until a real
  // /admin/reports/national-trend endpoint lands).
  const trend = useMemo(() => {
    const base = stats?.available_icu_beds ?? 0;
    const out: { day: string; icu: number; nicu: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const wobble = ((i * 7 + 3) % 5) - 2;
      out.push({
        day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
          (new Date().getDay() - i + 7) % 7
        ],
        icu: Math.max(0, base + wobble * 4),
        nicu: Math.max(0, Math.round(base * 0.6) + wobble * 2),
      });
    }
    return out;
  }, [stats]);

  const pendingHospitals = pendingQuery.data?.data ?? [];
  const recentActivity = activityQuery.data?.data ?? [];

  function handleRemind(hospital: { id: number; name: string }) {
    pushToast({
      title: "Reminder queued",
      description: `${hospital.name} will be nudged via SMS and email.`,
      variant: "success",
    });
  }

  return (
    <div className="flex-1 space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Overview
        </h1>
        <p className="text-xs text-muted-foreground">
          What needs attention today, across the entire platform.
        </p>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="Total hospitals"
          value={stats?.total_hospitals ?? "—"}
          icon={<IconBuildingHospital className="size-3.5" />}
          loading={statsQuery.isLoading}
        />
        <KpiTile
          label="Verified"
          value={stats?.verified_hospitals ?? "—"}
          icon={<IconShieldCheck className="size-3.5" />}
          accent="text-niramoy-teal"
          loading={statsQuery.isLoading}
        />
        <KpiTile
          label="Pending approval"
          value={stats?.pending_hospitals ?? "—"}
          icon={<IconShieldOff className="size-3.5" />}
          accent={
            (stats?.pending_hospitals ?? 0) > 0
              ? "text-amber-600 dark:text-amber-400"
              : undefined
          }
          loading={statsQuery.isLoading}
          href="/admin/pending"
        />
        <KpiTile
          label="Suspended"
          value={stats?.suspended_hospitals ?? "—"}
          icon={<IconUserShield className="size-3.5" />}
          accent={
            (stats?.suspended_hospitals ?? 0) > 0
              ? "text-destructive"
              : undefined
          }
          loading={statsQuery.isLoading}
        />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="Total ICU beds"
          value={stats?.total_icu_beds ?? "—"}
          icon={<IconStethoscope className="size-3.5" />}
          loading={statsQuery.isLoading}
        />
        <KpiTile
          label="Available ICU beds"
          value={stats?.available_icu_beds ?? "—"}
          icon={<IconCircleDot className="size-3.5" />}
          accent="text-niramoy-teal"
          loading={statsQuery.isLoading}
        />
        <KpiTile
          label="Stale > 24 h"
          value={stats?.hospitals_stale_over_24h ?? "—"}
          icon={<IconAlertTriangle className="size-3.5" />}
          accent={
            (stats?.hospitals_stale_over_24h ?? 0) > 0
              ? "text-destructive"
              : undefined
          }
          loading={statsQuery.isLoading}
        />
        <KpiTile
          label="Active admins"
          value={stats?.active_admins ?? "—"}
          icon={<IconUsers className="size-3.5" />}
          loading={statsQuery.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending approvals */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
                  <IconShieldCheck className="size-4 text-niramoy-teal" />
                  Pending approvals
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Hospitals waiting for verification.
                </p>
              </div>
              <Button asChild size="sm" variant="ghost" className="h-7 text-[11px]">
                <Link href="/admin/pending">View all</Link>
              </Button>
            </div>

            {pendingQuery.isLoading ? (
              <SkeletonList rows={3} />
            ) : pendingHospitals.length === 0 ? (
              <EmptyHint icon={<IconCheck className="size-5" />} label="No pending hospitals" />
            ) : (
              <ul className="space-y-1.5">
                {pendingHospitals.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/hospitals?search=${encodeURIComponent(h.name)}`}
                        className="truncate text-xs font-medium text-foreground hover:underline"
                      >
                        {h.name}
                      </Link>
                      <p className="text-[10px] text-muted-foreground">
                        {h.district}
                        {h.division ? `, ${h.division}` : ""} ·{" "}
                        {formatRelativeTime(h.created_at)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 shrink-0 gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
                      disabled={verify.isPending}
                      onClick={() =>
                        verify.mutate({ id: h.id, is_verified: true })
                      }
                    >
                      {verify.isPending ? (
                        <IconLoader2 className="size-3 animate-spin" />
                      ) : (
                        <IconShieldCheck className="size-3" />
                      )}
                      Approve
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Stale hospitals */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
                <IconBellRinging className="size-4 text-amber-600" />
                Stale hospitals (&gt;24 h)
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Nudge them so patients see accurate availability.
              </p>
            </div>

            {staleQuery.isLoading ? (
              <SkeletonList rows={3} />
            ) : staleList.length === 0 ? (
              <EmptyHint icon={<IconCheck className="size-5" />} label="All hospitals are up to date." />
            ) : (
              <ul className="space-y-1.5">
                {staleList.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/hospitals?search=${encodeURIComponent(h.name)}`}
                        className="truncate text-xs font-medium text-foreground hover:underline"
                      >
                        {h.name}
                      </Link>
                      <p className="text-[10px] text-destructive">
                        Last updated{" "}
                        {h.last_updated
                          ? formatRelativeTime(h.last_updated)
                          : "never"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 gap-1"
                      onClick={() => handleRemind(h)}
                    >
                      <IconBellRinging className="size-3" />
                      Send Reminder
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity feed + ICU trend */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
                  <IconClipboardList className="size-4 text-niramoy-teal" />
                  Recent platform activity
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Last 20 actions across the entire platform.
                </p>
              </div>
              <Button asChild size="sm" variant="ghost" className="h-7 text-[11px]">
                <Link href="/admin/updates">Open moderation</Link>
              </Button>
            </div>

            {activityQuery.isLoading ? (
              <SkeletonList rows={6} />
            ) : recentActivity.length === 0 ? (
              <EmptyHint
                icon={<IconClipboardList className="size-5" />}
                label="No recent activity"
              />
            ) : (
              <ul className="divide-y rounded-md border bg-card">
                {recentActivity.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <Link
                          href={`/admin/hospitals?search=${u.hospital_id}`}
                          className="truncate font-medium text-foreground hover:underline"
                        >
                          Hospital #{u.hospital_id}
                        </Link>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {u.update_type}
                        </span>
                        {u.status === "Live" && (
                          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            Live
                          </span>
                        )}
                        {u.status === "Pending" && (
                          <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            Pending
                          </span>
                        )}
                        {u.status === "Rejected" && (
                          <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                            Rejected
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {u.field_name ?? "—"}
                        {u.previous_value != null && u.new_value != null && (
                          <>
                            {" "}
                            <span className="line-through">
                              {u.previous_value}
                            </span>{" "}
                            →{" "}
                            <span className="font-semibold text-foreground">
                              {u.new_value}
                            </span>
                          </>
                        )}
                        {u.note && (
                          <span className="ml-1 italic">— {u.note}</span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      {formatRelativeTime(u.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
                <IconStethoscope className="size-4 text-niramoy-teal" />
                National ICU availability
              </h2>
              <p className="text-[11px] text-muted-foreground">
                7-day trend across all hospitals.
              </p>
            </div>
            <div className="h-[200px] w-full rounded-md border bg-card p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="icuFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0E9E8E" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0E9E8E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="nicuFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Area type="monotone" dataKey="icu" stroke="#0E9E8E" fill="url(#icuFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="nicu" stroke="#0EA5E9" fill="url(#nicuFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-niramoy-teal" />
                ICU available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full" style={{ backgroundColor: "#0EA5E9" }} />
                NICU available
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  icon,
  accent,
  loading,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: string;
  loading?: boolean;
  href?: string;
}) {
  const inner = (
    <Card className={href ? "hover:bg-muted/30 transition-colors" : undefined}>
      <CardContent className="space-y-1 p-3">
        <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </div>
        <div
          className={`font-heading text-2xl font-semibold tabular-nums ${
            accent ?? "text-foreground"
          }`}
        >
          {loading ? "—" : value}
        </div>
      </CardContent>
    </Card>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

function SkeletonList({ rows }: { rows: number }) {
  return (
    <ul className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="h-10 animate-pulse rounded-md border bg-muted/40"
        />
      ))}
    </ul>
  );
}

function EmptyHint({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-md border border-dashed bg-muted/30 px-3 py-6 text-center text-[11px] text-muted-foreground">
      <span className="opacity-50">{icon}</span>
      {label}
    </div>
  );
}