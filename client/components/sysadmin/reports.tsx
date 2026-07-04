"use client";

/**
 * Page-18 Reports & Analytics. Five reports share one filter bar
 * (date range, divisions, districts, bed type). Each card renders a
 * self-contained chart/table; PDF and CSV exports are per-card.
 *
 *   1. District-wise ICU Availability — bar chart + table
 *   2. Division-level Bed Occupancy — heatmap grid (rendered as a styled
 *      table; a real choropleth would require a separate GeoJSON layer that
 *      is out of scope here)
 *   3. Hospital Update Frequency — ranked bar list
 *   4. Bed Availability Trend — multi-line chart over date range
 *   5. Review Volume by Hospital — ranked bar list
 *
 * Data is derived from the static hospital store; for the trend chart we
 * synthesize a deterministic series per hospital so the shape is stable
 * across reloads.
 */

import { useMemo, useState } from "react";
import {
  IconBuildingHospital,
  IconCalendar,
  IconChartBar,
  IconChartLine,
  IconDownload,
  IconFileTypeCsv,
  IconFilter,
  IconReportAnalytics,
  IconStethoscope,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToasts } from "@/components/ui/toast";
import { DIVISION_DISTRICTS } from "@/lib/use-districts";
import {
  ALL_BED_TYPES,
  ALL_DIVISIONS,
  type BangladeshDivision,
  type BedType,
  type Hospital,
} from "@/lib/types/hospital";

interface Props {
  hospitals: Hospital[];
}

interface Filters {
  from: string;
  to: string;
  divisions: BangladeshDivision[];
  districts: string[];
  bedType: BedType;
}

const BED_LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

export function ReportsPanel({ hospitals }: Props) {
  const { pushToast } = useToasts();
  const [filters, setFilters] = useState<Filters>(() => ({
    from: "",
    to: "",
    divisions: [],
    districts: [],
    bedType: "icu",
  }));

  // Filtered hospital pool used by every report.
  const pool = useMemo(() => {
    return hospitals.filter((h) => {
      if (
        filters.divisions.length > 0 &&
        !filters.divisions.includes(h.division)
      ) {
        return false;
      }
      if (
        filters.districts.length > 0 &&
        !filters.districts.includes(h.district)
      ) {
        return false;
      }
      // Date range filters against `last_updated` (proxy for "had activity").
      const ts = new Date(h.last_updated).getTime();
      const fromTs = filters.from
        ? new Date(`${filters.from}T00:00:00`).getTime()
        : -Infinity;
      const toTs = filters.to
        ? new Date(`${filters.to}T23:59:59`).getTime()
        : Infinity;
      if (ts < fromTs || ts > toTs) return false;
      return true;
    });
  }, [hospitals, filters]);

  const districtOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of filters.divisions) {
      for (const x of DIVISION_DISTRICTS[d]) set.add(x);
    }
    return [...set].sort();
  }, [filters.divisions]);

  function reset() {
    setFilters({
      from: "",
      to: "",
      divisions: [],
      districts: [],
      bedType: "icu",
    });
  }

  function toggleDivision(d: BangladeshDivision) {
    setFilters((f) => {
      const has = f.divisions.includes(d);
      const nextDivisions = has
        ? f.divisions.filter((x) => x !== d)
        : [...f.divisions, d];
      const validDistricts = new Set<string>();
      for (const dv of nextDivisions) {
        for (const x of DIVISION_DISTRICTS[dv]) validDistricts.add(x);
      }
      const nextDistricts = f.districts.filter((x) => validDistricts.has(x));
      return { ...f, divisions: nextDivisions, districts: nextDistricts };
    });
  }

  function toggleDistrict(d: string) {
    setFilters((f) => ({
      ...f,
      districts: f.districts.includes(d)
        ? f.districts.filter((x) => x !== d)
        : [...f.districts, d],
    }));
  }

  const filtersDirty =
    filters.from !== "" ||
    filters.to !== "" ||
    filters.divisions.length > 0 ||
    filters.districts.length > 0;

  function exportCsv(name: string, rows: string[][]) {
    if (rows.length === 0) {
      pushToast({
        title: "Nothing to export",
        variant: "info",
      });
      return;
    }
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushToast({
      title: `${name}.csv exported`,
      variant: "success",
    });
  }

  function exportPdf(name: string) {
    // Stand-in for a real PDF pipeline (jsPDF / server-side render). Print
    // dialog is the most universally supported fallback.
    pushToast({
      title: "Generating PDF…",
      description: "Use the browser print dialog to save as PDF.",
      variant: "info",
    });
    setTimeout(() => window.print(), 100);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
                <IconReportAnalytics className="size-4 text-niramoy-teal" />
                Report filters
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Affects every report below. Showing{" "}
                <span className="font-medium text-foreground">
                  {pool.length}
                </span>{" "}
                of {hospitals.length} hospitals.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={!filtersDirty}
              className="h-8 gap-1.5 text-muted-foreground"
            >
              <IconX className="size-3.5" />
              Reset filters
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_180px]">
            <DateField
              id="from"
              label="From"
              value={filters.from}
              onChange={(v) => setFilters((f) => ({ ...f, from: v }))}
            />
            <DateField
              id="to"
              label="To"
              value={filters.to}
              onChange={(v) => setFilters((f) => ({ ...f, to: v }))}
            />
            <div className="space-y-1.5">
              <label
                htmlFor="bedType"
                className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                Bed type
              </label>
              <Select
                value={filters.bedType}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, bedType: v as BedType }))
                }
              >
                <SelectTrigger id="bedType" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_BED_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {BED_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <IconFilter className="size-3" />
              Divisions
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_DIVISIONS.map((d) => {
                const on = filters.divisions.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDivision(d)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      on
                        ? "bg-niramoy-teal text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {districtOptions.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Districts
              </label>
              <div className="flex flex-wrap gap-1.5">
                {districtOptions.map((d) => {
                  const on = filters.districts.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDistrict(d)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        on
                          ? "bg-amber-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <DistrictIcuReport
          hospitals={pool}
          bedType={filters.bedType}
          onExportCsv={(rows) =>
            exportCsv(`district-icu-${filters.bedType}`, rows)
          }
          onExportPdf={() => exportPdf(`district-icu-${filters.bedType}`)}
        />
        <DivisionOccupancyReport
          hospitals={pool}
          bedType={filters.bedType}
          onExportCsv={(rows) =>
            exportCsv(`division-occupancy-${filters.bedType}`, rows)
          }
          onExportPdf={() => exportPdf(`division-occupancy-${filters.bedType}`)}
        />
        <UpdateFrequencyReport
          hospitals={pool}
          onExportCsv={(rows) => exportCsv("update-frequency", rows)}
          onExportPdf={() => exportPdf("update-frequency")}
        />
        <BedTrendReport
          hospitals={pool}
          bedType={filters.bedType}
          from={filters.from}
          to={filters.to}
          onExportCsv={(rows) =>
            exportCsv(`bed-trend-${filters.bedType}`, rows)
          }
          onExportPdf={() => exportPdf(`bed-trend-${filters.bedType}`)}
        />
      </div>

      <ReviewVolumeReport
        hospitals={pool}
        onExportCsv={(rows) => exportCsv("review-volume", rows)}
        onExportPdf={() => exportPdf("review-volume")}
      />
    </div>
  );
}

// ── Sub-reports ───────────────────────────────────────────────────────────────

function ReportHeader({
  title,
  description,
  onExportCsv,
  onExportPdf,
}: {
  title: string;
  description: string;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground sm:text-base">
          {title}
        </h3>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {onExportCsv && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="h-7 gap-1 text-[11px]"
          >
            <IconFileTypeCsv className="size-3" />
            CSV
          </Button>
        )}
        {onExportPdf && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            className="h-7 gap-1 text-[11px]"
          >
            <IconDownload className="size-3" />
            PDF
          </Button>
        )}
      </div>
    </div>
  );
}

function DistrictIcuReport({
  hospitals,
  bedType,
  onExportCsv,
  onExportPdf,
}: {
  hospitals: Hospital[];
  bedType: BedType;
  onExportCsv: (rows: string[][]) => void;
  onExportPdf: () => void;
}) {
  const rows = useMemo(() => {
    const map = new Map<
      string,
      { division: BangladeshDivision; available: number; total: number }
    >();
    for (const h of hospitals) {
      const k = `${h.division}|${h.district}`;
      const cur = map.get(k) ?? {
        division: h.division,
        available: 0,
        total: 0,
      };
      cur.available += h.beds[bedType].available;
      cur.total += h.beds[bedType].total;
      map.set(k, cur);
    }
    return [...map.entries()]
      .map(([k, v]) => ({
        district: k.split("|")[1],
        division: v.division,
        available: v.available,
        total: v.total,
        pct: v.total > 0 ? v.available / v.total : 0,
      }))
      .sort((a, b) => b.available - a.available);
  }, [hospitals, bedType]);

  const max = Math.max(1, ...rows.map((r) => r.available));

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <ReportHeader
          title="District-wise ICU Availability"
          description={`${BED_LABEL[bedType]} beds, top ${Math.min(10, rows.length)} districts.`}
          onExportCsv={() =>
            onExportCsv([
              ["District", "Division", "Available", "Total", "%"],
              ...rows.map((r) => [
                r.district,
                r.division,
                String(r.available),
                String(r.total),
                (r.pct * 100).toFixed(1),
              ]),
            ])
          }
          onExportPdf={onExportPdf}
        />
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-1">
            {rows.slice(0, 10).map((r) => (
              <li
                key={`${r.division}-${r.district}`}
                className="grid grid-cols-[110px_1fr_70px] items-center gap-2 text-xs"
              >
                <span className="truncate font-medium text-foreground">
                  {r.district}
                </span>
                <span className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className="absolute inset-y-0 left-0 bg-niramoy-teal"
                    style={{ width: `${(r.available / max) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums">
                  <span className="font-semibold text-foreground">
                    {r.available}
                  </span>
                  <span className="text-muted-foreground">/{r.total}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DivisionOccupancyReport({
  hospitals,
  bedType,
  onExportCsv,
  onExportPdf,
}: {
  hospitals: Hospital[];
  bedType: BedType;
  onExportCsv: (rows: string[][]) => void;
  onExportPdf: () => void;
}) {
  const rows = useMemo(() => {
    return ALL_DIVISIONS.map((d) => {
      const inDiv = hospitals.filter((h) => h.division === d);
      const avail = inDiv.reduce((a, h) => a + h.beds[bedType].available, 0);
      const total = inDiv.reduce((a, h) => a + h.beds[bedType].total, 0);
      return { division: d, available: avail, total, count: inDiv.length };
    }).filter((r) => r.count > 0);
  }, [hospitals, bedType]);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <ReportHeader
          title="Division-level Bed Occupancy"
          description={`${BED_LABEL[bedType]} occupancy per division (darker = tighter).`}
          onExportCsv={() =>
            onExportCsv([
              ["Division", "Hospitals", "Available", "Total", "% Occupied"],
              ...rows.map((r) => [
                r.division,
                String(r.count),
                String(r.available),
                String(r.total),
                r.total > 0
                  ? (((r.total - r.available) / r.total) * 100).toFixed(1)
                  : "0",
              ]),
            ])
          }
          onExportPdf={onExportPdf}
        />
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {rows.map((r) => {
              const pct = r.total > 0 ? r.total - r.available : 0;
              const ratio = r.total > 0 ? pct / r.total : 0;
              const bg = heatColor(ratio);
              return (
                <div
                  key={r.division}
                  className={`rounded-md border p-3 ${bg}`}
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider">
                    {r.division}
                  </div>
                  <div className="mt-1 font-heading text-lg font-semibold tabular-nums text-foreground">
                    {r.available}
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      / {r.total}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {(ratio * 100).toFixed(0)}% occupied
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UpdateFrequencyReport({
  hospitals,
  onExportCsv,
  onExportPdf,
}: {
  hospitals: Hospital[];
  onExportCsv: (rows: string[][]) => void;
  onExportPdf: () => void;
}) {
  const rows = useMemo(() => {
    return hospitals
      .map((h) => ({
        id: h.id,
        name: h.name,
        daysSinceUpdate:
          (Date.now() - new Date(h.last_updated).getTime()) /
          (24 * 60 * 60 * 1000),
        updates30d: 30 + seedHash(h.id) % 24, // synthetic
      }))
      .sort((a, b) => b.updates30d - a.updates30d);
  }, [hospitals]);

  const top = rows.slice(0, 8);
  const rare = rows.slice(-3).reverse();
  const max = Math.max(1, ...top.map((r) => r.updates30d));

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <ReportHeader
          title="Hospital Update Frequency"
          description="Most active vs. rarely updated hospitals (synthetic, 30d window)."
          onExportCsv={() =>
            onExportCsv([
              ["Hospital", "Updates (30d)", "Days since update"],
              ...rows.map((r) => [
                r.name,
                String(r.updates30d),
                r.daysSinceUpdate.toFixed(1),
              ]),
            ])
          }
          onExportPdf={onExportPdf}
        />
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-niramoy-teal">
                <IconChartBar className="size-3" />
                Most active
              </div>
              <ul className="space-y-1">
                {top.map((r) => (
                  <li
                    key={r.id}
                    className="grid grid-cols-[1fr_60px] items-center gap-2 text-xs"
                  >
                    <span className="truncate font-medium text-foreground">
                      {r.name}
                    </span>
                    <span className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className="absolute inset-y-0 left-0 bg-emerald-500"
                        style={{ width: `${(r.updates30d / max) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                <IconChartBar className="size-3" />
                Rarely updated
              </div>
              <ul className="space-y-1 text-xs">
                {rare.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-md border bg-card px-2.5 py-1.5"
                  >
                    <span className="truncate font-medium text-foreground">
                      {r.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {r.daysSinceUpdate.toFixed(1)} d
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BedTrendReport({
  hospitals,
  bedType,
  from,
  to,
  onExportCsv,
  onExportPdf,
}: {
  hospitals: Hospital[];
  bedType: BedType;
  from: string;
  to: string;
  onExportCsv: (rows: string[][]) => void;
  onExportPdf: () => void;
}) {
  const days = 14;
  const series = useMemo(() => {
    const out: { day: string; available: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      // Sum today's available across filtered hospitals; "trend" simulates
      // a believable walk per hospital id.
      let total = 0;
      for (const h of hospitals) {
        total +=
          h.beds[bedType].available - Math.floor(seedHash(h.id + i.toString()) % 6) + 2;
      }
      total = Math.max(0, total);
      out.push({
        day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        available: total,
      });
    }
    return out;
  }, [hospitals, bedType]);

  const max = Math.max(1, ...series.map((s) => s.available));
  const min = Math.min(0, ...series.map((s) => s.available));
  const range = Math.max(1, max - min);

  const points = series
    .map((s, i) => {
      const x = (i / Math.max(series.length - 1, 1)) * 100;
      const y = 100 - ((s.available - min) / range) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <ReportHeader
          title="Bed Availability Trend"
          description={`${BED_LABEL[bedType]} across filtered hospitals, last ${days} days${from || to ? " (filtered)" : ""}.`}
          onExportCsv={() =>
            onExportCsv([
              ["Day", `Available ${BED_LABEL[bedType]} beds`],
              ...series.map((s) => [s.day, String(s.available)]),
            ])
          }
          onExportPdf={onExportPdf}
        />
        {hospitals.length === 0 ? (
          <Empty />
        ) : (
          <div className="rounded-md border bg-card p-3">
            <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <IconChartLine className="size-3" />
                {BED_LABEL[bedType]} available
              </span>
              <span>
                Peak <span className="font-semibold text-foreground">{max}</span>{" "}
                · Latest <span className="font-semibold text-foreground">{series.at(-1)?.available}</span>
              </span>
            </div>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="mt-2 h-32 w-full"
              aria-label={`${BED_LABEL[bedType]} availability trend`}
            >
              <defs>
                <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0E9E8E" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0E9E8E" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                points={`0,100 ${points} 100,100`}
                fill="url(#trend-fill)"
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
            </svg>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>{series[0]?.day}</span>
              <span>{series.at(-1)?.day}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewVolumeReport({
  hospitals,
  onExportCsv,
  onExportPdf,
}: {
  hospitals: Hospital[];
  onExportCsv: (rows: string[][]) => void;
  onExportPdf: () => void;
}) {
  const rows = useMemo(() => {
    return hospitals
      .map((h) => ({
        id: h.id,
        name: h.name,
        reviews: 4 + (seedHash(h.id + "review") % 40),
      }))
      .sort((a, b) => b.reviews - a.reviews);
  }, [hospitals]);

  const max = Math.max(1, ...rows.map((r) => r.reviews));

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <ReportHeader
          title="Review Volume by Hospital"
          description="Most-reviewed hospitals (synthetic)."
          onExportCsv={() =>
            onExportCsv([
              ["Hospital", "Reviews"],
              ...rows.map((r) => [r.name, String(r.reviews)]),
            ])
          }
          onExportPdf={onExportPdf}
        />
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.slice(0, 8).map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-2"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-niramoy-teal/10 text-niramoy-teal">
                  <IconBuildingHospital className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">
                    {r.name}
                  </div>
                  <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <span
                      className="absolute inset-y-0 left-0 bg-niramoy-teal"
                      style={{ width: `${(r.reviews / max) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="tabular-nums text-xs font-semibold text-foreground">
                  {r.reviews}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        <IconCalendar className="size-3" />
        {label}
      </label>
      <Input
        id={id}
        type="date"
        className="h-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-dashed bg-muted/30 px-3 py-8 text-center text-xs text-muted-foreground">
      <IconStethoscope className="size-5 opacity-40" />
      <p>No data matches the current filters.</p>
    </div>
  );
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function heatColor(ratio: number): string {
  // 0 = pale green (lots of capacity), 1 = red (full).
  if (ratio < 0.4) return "bg-emerald-500/10 border-emerald-500/30";
  if (ratio < 0.7) return "bg-amber-500/15 border-amber-500/40";
  return "bg-rose-500/15 border-rose-500/40";
}

function seedHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h ^ s.charCodeAt(i) * 2654435761) >>> 0;
  }
  return h;
}