/**
 * Pure helpers for the hospital feature.
 *
 * Everything here is referentially transparent — no React, no I/O. It is the
 * only file that knows about the color palette / availability math, so future
 * palette tweaks happen in one place.
 */

import type {
  AvailabilityClass,
  Hospital,
  HospitalFeatureCollection,
  HospitalStats,
} from "@/lib/types/hospital";
import type { BedType } from "@/lib/types/hospital";

/**
 * 24 hours in milliseconds. A hospital whose `last_updated` is older than
 * this is rendered grey ("stale") across the platform per AGENTS.md.
 */
export const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Map an AvailabilityClass to a literal color. The map's paint expression
 * needs literal hex strings (not CSS variables), which is why this is JS code,
 * not Tailwind classes.
 */
export const AVAILABILITY_COLORS: Record<AvailabilityClass, string> = {
  high: "#22c55e",
  medium: "#eab308",
  low: "#ef4444",
  stale: "#9ca3af",
  /** A teal so "not offered" hospitals are still visible on the map. */
  none: "#0E9E8E",
};

export function availabilityColor(c: AvailabilityClass): string {
  return AVAILABILITY_COLORS[c];
}

/**
 * Compute the availability bucket for a single (hospital, bed type) pair.
 * `stale` wins over every other bucket because stale data is meaningless.
 * `none` (offered zero of these beds) wins over red so the platform doesn't
 * visually punish hospitals for a department they don't run.
 */
export function getAvailabilityClass(
  hospital: Hospital,
  type: BedType,
  now: number = Date.now(),
): AvailabilityClass {
  const updatedAt = new Date(hospital.last_updated).getTime();
  if (Number.isFinite(updatedAt) && now - updatedAt > STALE_THRESHOLD_MS) {
    return "stale";
  }
  const { total, available } = hospital.beds[type];
  if (total <= 0) return "none";
  const ratio = available / total;
  if (ratio > 0.5) return "high";
  if (ratio >= 0.1) return "medium";
  return "low";
}

/**
 * Convert a Hospital[] to a GeoJSON FeatureCollection for MapLibre.
 *
 * Each feature's `properties.availability_class` is computed against the ICU
 * bed type — the headline metric drives marker color. Per-type detail is
 * surfaced in popups and result cards (which call `getAvailabilityClass`
 * directly).
 */
export function hospitalsToFeatureCollection(
  hospitals: Hospital[],
): HospitalFeatureCollection {
  return {
    type: "FeatureCollection",
    features: hospitals.map((h) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [h.lng, h.lat] },
      properties: {
        ...h,
        availability_class: getAvailabilityClass(h, "icu"),
      },
    })),
  };
}

/**
 * Stable MapLibre paint expression that colors unclustered points by their
 * `availability_class` property. Memoize this once and reuse — MapLibre
 * re-evaluates it per feature on every paint, but the expression itself is
 * a constant.
 *
 * `as unknown as ExpressionSpecification` because the upstream type wants a
 * literal recursive tuple, which our linter would otherwise reject.
 */
export function buildAvailabilityPaintExpression(): unknown {
  return [
    "match",
    ["get", "availability_class"],
    "high",
    AVAILABILITY_COLORS.high,
    "medium",
    AVAILABILITY_COLORS.medium,
    "low",
    AVAILABILITY_COLORS.low,
    "stale",
    AVAILABILITY_COLORS.stale,
    /* fall-through */ AVAILABILITY_COLORS.none,
  ];
}

/**
 * Aggregate stats for the live-stats-bar. Cheap; called on every store change.
 */
export function computeStats(hospitals: Hospital[]): HospitalStats {
  let icuAvailable = 0;
  let nicuAvailable = 0;
  let lastUpdatedMax = hospitals[0]?.last_updated ?? new Date().toISOString();
  for (const h of hospitals) {
    icuAvailable += h.beds.icu.available;
    nicuAvailable += h.beds.nicu.available;
    if (h.last_updated > lastUpdatedMax) lastUpdatedMax = h.last_updated;
  }
  return {
    totalHospitals: hospitals.length,
    icuAvailable,
    nicuAvailable,
    lastUpdatedMax,
  };
}

/**
 * "12 min ago", "3 h ago", "2 d ago". Stale (≥24h) is rendered as the date.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso;
  const diffMs = now - then;
  if (diffMs < 0) return "just now";
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(iso).toLocaleDateString();
}

/** "৳12,000" — BDT, no decimals. */
export function formatTaka(n: number): string {
  if (!Number.isFinite(n)) return "৳0";
  return `৳${Math.round(n).toLocaleString("en-IN")}`;
}

/** Haversine distance in km between [lng,lat] and [lng,lat]. */
export function haversineKm(
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  const R = 6371; // km
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
