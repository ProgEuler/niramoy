/**
 * Domain types for Niramoy hospital data.
 *
 * `Hospital` is the canonical shape used everywhere: the store, utilities,
 * components, and the GeoJSON feature payload fed to the map.
 *
 * The `availability_class` field is precomputed by `useHospitalStore()` so the
 * MapLibre paint expression can read it without a per-feature re-evaluation
 * of `getAvailabilityClass()` (cheap, but unnecessary on every map render).
 */

export type BedType = "icu" | "nicu" | "ccu" | "hdu";

export type BedCount = {
  total: number;
  available: number;
};

export type HospitalType = "public" | "private";

/**
 * Color bucket for a single (hospital, bed type) combination.
 * - "high"   : > 50% available   → green
 * - "medium" : 10–50% available  → orange
 * - "low"    : < 10% available   → red (or zero)
 * - "stale"  : last_updated > 24h → grey (overrides other buckets)
 * - "none"   : bed type not offered by this hospital → teal (visible, not red)
 */
export type AvailabilityClass = "high" | "medium" | "low" | "stale" | "none";

export type BangladeshDivision =
  | "Dhaka"
  | "Chattogram"
  | "Rajshahi"
  | "Khulna"
  | "Barishal"
  | "Rangpur"
  | "Mymensingh"
  | "Sylhet";

export const ALL_DIVISIONS: readonly BangladeshDivision[] = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Rangpur",
  "Mymensingh",
  "Sylhet",
] as const;

export const ALL_BED_TYPES: readonly BedType[] = [
  "icu",
  "nicu",
  "ccu",
  "hdu",
] as const;

export interface Hospital {
  /** Stable slug, e.g. "dmch-dhaka". */
  id: string;
  /** Display name in English. */
  name: string;
  /** Display name in Bengali (UTF-8). Future i18n will use this directly. */
  name_bn: string;
  division: BangladeshDivision;
  district: string;
  /** WGS84 latitude. */
  lat: number;
  /** WGS84 longitude. */
  lng: number;
  type: HospitalType;
  beds: Record<BedType, BedCount>;
  /** Cost in BDT per day, per bed type. Use 0 for public hospitals. */
  price: Record<BedType, number>;
  /** E.164 phone, e.g. "+8801711000000". Tappable on mobile. */
  phone: string;
  /** ISO 8601 timestamp. >24h old → data is stale (grey). */
  last_updated: string;
  /** Verified by Niramoy system admins. Public search always requires this for trust. */
  verified: boolean;
  address: string;
  /** Optional 0–5 star rating, used by the "Top Rated" sort. */
  rating?: number;
  /** Precomputed bucket for the ICU bed type; consumed by the map paint expression. */
  availability_class?: AvailabilityClass;
}

/** GeoJSON properties = Hospital + the precomputed availability_class. */
export type HospitalProperties = Hospital;

export type HospitalFeatureCollection =
  GeoJSON.FeatureCollection<GeoJSON.Point, HospitalProperties>;

export interface HospitalStats {
  totalHospitals: number;
  icuAvailable: number;
  nicuAvailable: number;
  /** Newest ISO timestamp across the dataset (used by the "Last updated" tile). */
  lastUpdatedMax: string;
}
