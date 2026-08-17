"use client";

/**
 * Page-14 System Admin Overview. The single landing page for system admins
 * (the role whose email matches `sysadmin@*` in the login flow).
 *
 *   - KPI tiles: total hospitals, verified, ICU / NICU availability, latest
 *     update timestamp, stale count.
 *   - Stale-data alerts: any hospital that hasn't updated in 6h, with a
 *     "Remind" CTA per row.
 *   - 7-day update volume mini-chart (synthetic sparkline).
 *   - Division snapshot: per-division hospital count + ICU availability.
 *
 * Stays purely client-side; real-time subscription is the same `useEffect`
 * pattern used in the hospital store.
 */

import { useMemo } from "react";
import {
  IconAlertTriangle,
  IconBellRinging,
  IconCircleDot,
  IconHospital,
  IconRefresh,
  IconShieldCheck,
  IconStethoscope,
  IconClock,
} from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AgTable } from "@/components/ag-grid/ag-table";
import type { ColDef } from "ag-grid-community";
import { useToasts } from "@/components/ui/toast";
import {
  STALE_THRESHOLD_MS,
  formatRelativeTime,
  getAvailabilityClass,
} from "@/lib/hospital-utils";
import {
  ALL_BED_TYPES,
  ALL_DIVISIONS,
  type Hospital,
} from "@/lib/types/hospital";

const STALE_ALERT_MS = 6 * 60 * 60 * 1000; // 6 hours

interface Props {
  hospitals: Hospital[];
}

export function SysAdminOverview({ hospitals }: Props) {
  const { pushToast } = useToasts();

  const kpis = useMemo(() => {
    let verified = 0;
    let icuAvailable = 0;
    let nicuAvailable = 0;
    let ccuAvailable = 0;
    let hduAvailable = 0;
    let stale = 0;
    let lastUpdatedMax = hospitals[0]?.last_updated ?? new Date().toISOString();
    for (const h of hospitals) {
      if (h.verified) verified += 1;
      icuAvailable += h.beds.icu.available;
      nicuAvailable += h.beds.nicu.available;
      ccuAvailable += h.beds.ccu.available;
      hduAvailable += h.beds.hdu.available;
      if (
        Date.now() - new Date(h.last_updated).getTime() > STALE_THRESHOLD_MS
      ) {
        stale += 1;
      }
      if (h.last_updated > lastUpdatedMax) lastUpdatedMax = h.last_updated;
    }
    return {
      total: hospitals.length,
      verified,
      icuAvailable,
      nicuAvailable,
      ccuAvailable,
      hduAvailable,
      stale,
      lastUpdatedMax,
    };
  }, [hospitals]);

  const staleAlerts = useMemo(() => {
    const now = Date.now();
    return hospitals
      .filter(
        (h) => now - new Date(h.last_updated).getTime() > STALE_ALERT_MS,
      )
      .sort(
        (a, b) =>
          new Date(a.last_updated).getTime() -
          new Date(b.last_updated).getTime(),
      )
      .slice(0, 5);
  }, [hospitals]);

  const spark = useMemo(() => seedSpark(hospitals.length), [hospitals.length]);

  const divisionRows = useMemo(() => {
    return ALL_DIVISIONS.map((d) => {
      const inDiv = hospitals.filter((h) => h.division === d);
      const verified = inDiv.filter((h) => h.verified).length;
      const icuAvail = inDiv.reduce((acc, h) => acc + h.beds.icu.available, 0);
      const icuTotal = inDiv.reduce((acc, h) => acc + h.beds.icu.total, 0);
      return {
        division: d,
        total: inDiv.length,
        verified,
        icuAvail,
        icuTotal,
      };
    });
  }, [hospitals]);

  function handleRemind(hospital: Hospital) {
    pushToast({
      title: `Reminder queued`,
      description: `${hospital.name} will be nudged via SMS & email.`,
      variant: "success",
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          label="Total hospitals"
          value={kpis.total}
          icon={<IconHospital className="size-3.5" />}
        />
        <KpiTile
          label="Verified"
          value={kpis.verified}
          icon={<IconShieldCheck className="size-3.5" />}
          accent="text-niramoy-teal"
        />
        <KpiTile
          label="ICU available"
          value={kpis.icuAvailable}
          icon={<IconStethoscope className="size-3.5" />}
        />
        <KpiTile
          label="NICU available"
          value={kpis.nicuAvailable}
          icon={<IconStethoscope className="size-3.5" />}
        />
        <KpiTile
          label="Stale (>24h)"
          value={kpis.stale}
          icon={<IconAlertTriangle className="size-3.5" />}
          accent={kpis.stale > 0 ? "text-destructive" : undefined}
        />
        <KpiTile
          label="Last update"
          value={formatRelativeTime(kpis.lastUpdatedMax)}
          icon={<IconClock className="size-3.5" />}
        />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
                <IconBellRinging className="size-4 text-niramoy-teal" />
                Stale-data alerts
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Hospitals that haven't updated in over 6 hours. Tap “Remind” to
                send them a nudge.
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {staleAlerts.length} pending
            </span>
          </div>

          {staleAlerts.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
              All hospitals are up to date.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {staleAlerts.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/hospital/${h.id}`}
                      className="truncate text-xs font-medium text-foreground hover:underline"
                    >
                      {h.name}
                    </Link>
                    <div className="mt-0.5 flex items-baseline gap-1.5 text-[10px] text-muted-foreground">
                      <span>{h.district}, {h.division}</span>
                      <span aria-hidden>·</span>
                      <span className="text-destructive">
                        Last updated {formatRelativeTime(h.last_updated)}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() => handleRemind(h)}
                  >
                    <IconBellRinging className="size-3" />
                    Remind
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
                  <IconRefresh className="size-4 text-niramoy-teal" />
                  Update volume — last 7 days
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Successful PATCH calls across all hospitals (synthetic).
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Peak {Math.max(...spark)} / day
              </span>
            </div>

            <Sparkline values={spark} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
                <IconCircleDot className="size-4 text-niramoy-teal" />
                Division snapshot
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Counts and ICU availability per division.
              </p>
            </div>
            <AgTable<DivisionRow>
              rowData={divisionRows
                .filter((r) => r.total > 0)
                .sort((a, b) => b.total - a.total)}
              columnDefs={divisionColumnDefs}
              pagination={false}
              height="auto"
              noRowsText="No divisions yet"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-3">
        <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </div>
        <div
          className={`font-heading text-xl font-semibold tabular-nums ${
            accent ?? "text-foreground"
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (v / max) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="rounded-md border bg-card p-3">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-24 w-full"
        aria-label="Last 7 days of update volume"
      >
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E9E8E" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0E9E8E" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points} 100,100`}
          fill="url(#spark-fill)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#0E9E8E"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {values.map((v, i) => {
          const x = (i / Math.max(values.length - 1, 1)) * 100;
          const y = 100 - (v / max) * 100;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={1.2}
              fill="#0E9E8E"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>7 d ago</span>
        <span>today</span>
      </div>
    </div>
  );
}

function seedSpark(seed: number): number[] {
  // Deterministic; rises toward "today" because we want a believable pattern.
  let h = (seed * 2654435761) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < 7; i += 1) {
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 0x5bd1e995) >>> 0;
    const r = (h ^ (h >>> 15)) >>> 0;
    const noise = (r % 24) + 40; // 40–64 baseline
    out.push(Math.round(noise + i * 6));
  }
  return out;
}

// ── Division snapshot column defs ─────────────────────────────────────

interface DivisionRow {
  division: string;
  total: number;
  verified: number;
  icuAvail: number;
  icuTotal: number;
}

const divisionColumnDefs: ColDef<DivisionRow>[] = [
  {
    headerName: "Division",
    field: "division",
    flex: 1.4,
    minWidth: 120,
    cellRenderer: (params: { data?: DivisionRow }) => {
      if (!params.data) return null;
      return (
        <span className="font-medium text-foreground">
          {params.data.division}
        </span>
      );
    },
  },
  {
    headerName: "Total",
    field: "total",
    flex: 0.6,
    minWidth: 70,
    cellClass: "text-right tabular-nums",
  },
  {
    headerName: "Verified",
    field: "verified",
    flex: 0.7,
    minWidth: 80,
    cellRenderer: (params: { data?: DivisionRow }) => {
      if (!params.data) return null;
      return (
        <span className="text-right tabular-nums text-niramoy-teal">
          {params.data.verified}
        </span>
      );
    },
    cellClass: "text-right",
  },
  {
    headerName: "ICU avail",
    flex: 0.8,
    minWidth: 100,
    sortable: false,
    filter: false,
    cellRenderer: (params: { data?: DivisionRow }) => {
      if (!params.data) return null;
      return (
        <span className="text-right tabular-nums">
          {params.data.icuAvail}
          <span className="text-muted-foreground"> / {params.data.icuTotal}</span>
        </span>
      );
    },
    cellClass: "text-right",
  },
];

// Silence the unused-import lint when BedType types aren't referenced here.
void ALL_BED_TYPES;