"use client";

import Link from "next/link";
import { useMemo } from "react";
import { IconArrowRight, IconMap2 } from "@tabler/icons-react";
import { useHospitalStore } from "@/lib/use-hospital-store";
import { availabilityColor, getAvailabilityClass } from "@/lib/hospital-utils";
import type { BangladeshDivision } from "@/lib/types/hospital";

/**
 * Stylized SVG of Bangladesh's 8 divisions. The polygons are simplified
 * enough for a "preview" thumbnail — they convey the country's shape and
 * fill the choropleth with district-level ICU availability, but they are
 * NOT a cartographic-grade boundary dataset. (Map view page can pull the
 * real GeoJSON when it lands.)
 *
 * Coordinates are tuned to fit a 0 0 200 240 viewBox.
 */
const DIVISION_PATHS: Record<BangladeshDivision, string> = {
  Rajshahi:
    "M 10 90 L 50 78 L 90 84 L 95 110 L 80 130 L 40 134 L 14 120 Z",
  Rangpur:
    "M 14 50 L 60 42 L 100 50 L 100 78 L 50 78 L 10 90 L 6 70 Z",
  Khulna:
    "M 40 134 L 80 130 L 110 145 L 105 175 L 70 185 L 35 170 L 30 150 Z",
  Mymensingh:
    "M 95 60 L 130 56 L 145 80 L 130 100 L 100 100 L 95 84 Z",
  Dhaka:
    "M 100 100 L 130 100 L 145 120 L 130 142 L 105 145 L 95 110 L 100 100 Z",
  Sylhet:
    "M 130 36 L 175 30 L 188 60 L 165 78 L 145 80 L 130 56 Z",
  Chattogram:
    "M 130 142 L 145 120 L 175 130 L 185 170 L 155 200 L 125 175 L 130 142 Z",
  Barishal:
    "M 105 175 L 130 175 L 125 195 L 100 205 L 80 200 L 70 185 Z",
};

const DIVISION_LABELS: Record<BangladeshDivision, { x: number; y: number }> = {
  Rajshahi: { x: 50, y: 110 },
  Rangpur: { x: 50, y: 70 },
  Khulna: { x: 65, y: 158 },
  Mymensingh: { x: 120, y: 78 },
  Dhaka: { x: 118, y: 122 },
  Sylhet: { x: 160, y: 56 },
  Chattogram: { x: 158, y: 168 },
  Barishal: { x: 100, y: 192 },
};

const ALL_DIVISIONS = Object.keys(DIVISION_PATHS) as BangladeshDivision[];

export function BangladeshMapPreview() {
  const { hospitals } = useHospitalStore();

  // Aggregate ICU availability ratio per division. 0 means no hospitals.
  const ratios = useMemo(() => {
    const map: Record<string, { total: number; available: number; count: number }> = {};
    for (const d of ALL_DIVISIONS) {
      map[d] = { total: 0, available: 0, count: 0 };
    }
    for (const h of hospitals) {
      const cls = getAvailabilityClass(h, "icu");
      if (cls === "none" || cls === "stale") continue;
      const slot = map[h.division];
      if (!slot) continue;
      slot.total += h.beds.icu.total;
      slot.available += h.beds.icu.available;
      slot.count += 1;
    }
    return map;
  }, [hospitals]);

  function fillFor(div: BangladeshDivision): string {
    const r = ratios[div];
    if (!r || r.total === 0) return "#e5e7eb"; // greyed out — no data
    const ratio = r.available / r.total;
    if (ratio > 0.5) return availabilityColor("high");
    if (ratio >= 0.1) return availabilityColor("medium");
    return availabilityColor("low");
  }

  return (
    <section
      aria-labelledby="map-heading"
      className="border-y bg-muted/30"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-niramoy-teal">
            National view
          </p>
          <h2
            id="map-heading"
            className="mt-1 font-heading text-2xl font-semibold text-foreground sm:text-3xl"
          >
            ICU availability across Bangladesh
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            District-level heatmap of where beds are available right now.
            Darker red means tighter supply. Open the full map to drill into a
            region.
          </p>

          <Legend />

          <Link
            href="/map"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-niramoy-teal hover:underline"
          >
            <IconMap2 className="size-4" />
            View Full Map
            <IconArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="rounded-xl border bg-card p-4 ring-1 ring-foreground/5">
          <svg
            viewBox="0 0 200 240"
            className="mx-auto h-auto w-full max-w-md"
            role="img"
            aria-label="Stylized map of Bangladesh showing ICU availability by division"
          >
            <title>Bangladesh ICU availability by division</title>
            {ALL_DIVISIONS.map((div) => (
              <g key={div}>
                <path
                  d={DIVISION_PATHS[div]}
                  fill={fillFor(div)}
                  fillOpacity={0.85}
                  stroke="white"
                  strokeWidth={1.5}
                >
                  <title>{`${div} — ${ratios[div].available}/${ratios[div].total} ICU beds (${ratios[div].count} hospitals)`}</title>
                </path>
                <text
                  x={DIVISION_LABELS[div].x}
                  y={DIVISION_LABELS[div].y}
                  textAnchor="middle"
                  fontSize="6"
                  fontWeight="600"
                  fill="white"
                  style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 1 }}
                >
                  {div}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}

function Legend() {
  return (
    <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {[
        { label: "> 50% free", color: availabilityColor("high") },
        { label: "10–50% free", color: availabilityColor("medium") },
        { label: "< 10% free", color: availabilityColor("low") },
        { label: "No data", color: "#e5e7eb" },
      ].map((l) => (
        <li key={l.label} className="flex items-center gap-1.5">
          <span
            className="inline-block size-3 rounded-sm ring-1 ring-foreground/10"
            style={{ backgroundColor: l.color }}
          />
          {l.label}
        </li>
      ))}
    </ul>
  );
}
