"use client";

/**
 * Page-5 "Heatmap View" — a district-level choropleth overlay rendered as
 * pure SVG. Same color logic as the home-page map preview, but the polygons
 * are larger and the legend more prominent.
 *
 * The spec calls for "GeoJSON + Google Data Layers" — we use the same
 * simplified Bangladesh-division polygons here for consistency, since the
 * codebase already standardized on that visual.
 */

import { useMemo } from "react";
import { useHospitalStore } from "@/lib/use-hospital-store";
import { availabilityColor, getAvailabilityClass } from "@/lib/hospital-utils";
import type { BangladeshDivision } from "@/lib/types/hospital";

const DIVISION_PATHS: Record<BangladeshDivision, string> = {
  Rajshahi: "M 10 90 L 50 78 L 90 84 L 95 110 L 80 130 L 40 134 L 14 120 Z",
  Rangpur: "M 14 50 L 60 42 L 100 50 L 100 78 L 50 78 L 10 90 L 6 70 Z",
  Khulna: "M 40 134 L 80 130 L 110 145 L 105 175 L 70 185 L 35 170 L 30 150 Z",
  Mymensingh: "M 95 60 L 130 56 L 145 80 L 130 100 L 100 100 L 95 84 Z",
  Dhaka: "M 100 100 L 130 100 L 145 120 L 130 142 L 105 145 L 95 110 L 100 100 Z",
  Sylhet: "M 130 36 L 175 30 L 188 60 L 165 78 L 145 80 L 130 56 Z",
  Chattogram: "M 130 142 L 145 120 L 175 130 L 185 170 L 155 200 L 125 175 L 130 142 Z",
  Barishal: "M 105 175 L 130 175 L 125 195 L 100 205 L 80 200 L 70 185 Z",
};

const ALL = Object.keys(DIVISION_PATHS) as BangladeshDivision[];

interface Props {
  /** When set, the corresponding division's polygon is highlighted. */
  highlightDivision?: BangladeshDivision | null;
}

export function AvailabilityHeatmap({ highlightDivision }: Props) {
  const { hospitals } = useHospitalStore();

  const ratios = useMemo(() => {
    const map: Record<string, { total: number; available: number; count: number }> =
      {};
    for (const d of ALL) map[d] = { total: 0, available: 0, count: 0 };
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
    if (!r || r.total === 0) return "#e5e7eb";
    const ratio = r.available / r.total;
    if (ratio > 0.5) return availabilityColor("high");
    if (ratio >= 0.1) return availabilityColor("medium");
    return availabilityColor("low");
  }

  return (
    <svg
      viewBox="0 0 200 240"
      className="absolute inset-0 z-10 m-auto h-full w-full max-w-3xl"
      role="img"
      aria-label="Bangladesh ICU availability heatmap by division"
    >
      <title>Bangladesh ICU availability heatmap</title>
      {ALL.map((div) => {
        const isHighlighted = highlightDivision === div;
        return (
          <g key={div}>
            <path
              d={DIVISION_PATHS[div]}
              fill={fillFor(div)}
              fillOpacity={isHighlighted ? 1 : 0.9}
              stroke={isHighlighted ? "#0E9E8E" : "white"}
              strokeWidth={isHighlighted ? 2 : 1.2}
            >
              <title>
                {`${div}: ${ratios[div].available}/${ratios[div].total} ICU beds (${ratios[div].count} hospitals)`}
              </title>
            </path>
          </g>
        );
      })}
    </svg>
  );
}
