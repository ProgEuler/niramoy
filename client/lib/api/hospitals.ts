/**
 * Typed wrappers for the public hospital endpoints.
 *
 * Mirrors the FastAPI `public` router exactly so types don't drift.
 *
 * The /api/public/* namespace is unauthenticated — anyone can read these.
 * Used by the home page search, /find-care, /map, and the hospital detail
 * page.
 */

import { api } from "./client";
import type { PaginatedResponse } from "./admin";

// ── Shared shapes ──────────────────────────────────────────────────────

/**
 * Matches the backend `HospitalSummaryOut` shape (see backend
 * `backend/app/schemas/hospital.py`). Lightweight payload used by the
 * search list and map view.
 */
export interface HospitalSummary {
  id: number;
  name: string;
  address: string;
  district: string;
  /** Backend may not have every district mapped to a division yet. */
  division: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  is_active: boolean;
  icu_total: number;
  icu_available: number;
  nicu_total: number;
  nicu_available: number;
  ccu_total: number;
  ccu_available: number;
  hdu_total: number;
  hdu_available: number;
  cost_per_day_icu: number;
  cost_per_day_nicu: number;
  cost_per_day_ccu: number;
  cost_per_day_hdu: number;
  average_rating: number;
  total_reviews: number;
  last_updated: string | null;
  is_stale: boolean;
  /** Server-computed availability color hex, e.g. "#22c55e". */
  availability_color: string | null;
  distance_km: number | null;
  /** Curated flag surfaced on the landing page. */
  is_featured: boolean;
  /** Optional short description — used by the landing-page featured card. */
  description: string | null;
}

/**
 * Full hospital detail — used by /api/public/hospitals/{id}. Includes
 * description, photo, and contact numbers that the summary omits.
 */
export interface HospitalDetail extends HospitalSummary {
  phone_emergency: string | null;
  phone_general: string | null;
  description: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  facilities: string[];
  osm_id: number | null;
  operator_name: string | null;
  /** 7-day activity trend, populated by the detail endpoint. Always
   *  length 7 (oldest → today); days with no updates have `count: 0`. */
  availability_trend?: AvailabilityTrendPoint[];
}

export interface AvailabilityTrendPoint {
  /** ISO calendar date (YYYY-MM-DD) the bucket covers. */
  date: string;
  /** Number of update-history rows the admin recorded on that day. */
  count: number;
}

/** Sort keys accepted by the backend `/search` endpoint. */
export type SearchSortBy =
  | "nearest"
  | "most_available"
  | "lowest_cost"
  | "top_rated";

/** UI sort key → backend sort_by. */
export const UI_TO_BACKEND_SORT: Record<string, SearchSortBy> = {
  nearest: "nearest",
  available: "most_available",
  cost: "lowest_cost",
  rating: "top_rated",
};

/** Parameters for /api/public/search. All optional. */
export interface HospitalSearchParams {
  q?: string;
  /** Filter by district. Division filtering happens client-side from list. */
  district?: string;
  /**
   * Single bed type at a time (the backend validates `icu|nicu|ccu|hdu`).
   * The UI handles multi-bed selection client-side.
   */
  bed_type?: "icu" | "nicu" | "ccu" | "hdu";
  available_only?: boolean;
  cost_min?: number;
  cost_max?: number;
  min_rating?: number;
  sort_by?: SearchSortBy;
  /** User's location for distance ranking. */
  lat?: number;
  lng?: number;
  page?: number;
  page_size?: number;
}

// ── Endpoints ──────────────────────────────────────────────────────────

/**
 * GET /api/public/search
 *
 * Returns paginated hospital summaries matching the given filters. The
 * backend queries verified+active hospitals. Multi-bed selection and
 * division filtering are handled client-side by the page (the backend
 * doesn't accept either).
 */
export function searchHospitals(
  params: HospitalSearchParams = {},
  options: { signal?: AbortSignal } = {}
) {
  // Spread so the API client's `Record<string, …>` query param type is
  // satisfied without a cast — every field of `HospitalSearchParams` is
  // already a primitive.
  return api.get<PaginatedResponse<HospitalSummary>>(
    "/api/public/search",
    { query: { ...params }, signal: options.signal },
  );
}

/**
 * GET /api/public/hospitals/{id}
 *
 * Returns the full hospital detail including facilities, reviews, and the
 * 7-day availability trend chart.
 */
export function getHospitalById(
  id: number | string,
  options: { signal?: AbortSignal } = {},
) {
  return api.get<HospitalDetail>(`/api/public/hospitals/${id}`, {
    signal: options.signal,
  });
}

/**
 * GET /api/public/stats
 *
 * Returns aggregate platform stats. Currently returns 500 on the backend
 * when no hospitals exist — handled gracefully by the hook.
 */
export interface HospitalStatsResponse {
  total_hospitals: number;
  verified_hospitals: number;
  pending_approval: number;
  total_icu_beds: number;
  total_icu_available: number;
  total_nicu_beds: number;
  total_nicu_available: number;
  total_ccu_beds: number;
  total_ccu_available: number;
  total_hdu_beds: number;
  total_hdu_available: number;
  total_reviews: number;
  last_updated: string | null;
}

export function getHospitalStats(options: { signal?: AbortSignal } = {}) {
  return api.get<HospitalStatsResponse>("/api/public/stats", {
    signal: options.signal,
  });
}

/**
 * GET /api/public/hospitals/featured?limit=N
 *
 * Returns the curated landing-page featured list. The backend applies
 * verified+active+is_featured filters and sorts by `updated_at desc`.
 * `limit` is 1–50, default 12.
 */
export function getFeaturedHospitals(
  limit: number = 12,
  options: { signal?: AbortSignal } = {},
) {
  return api.get<HospitalSummary[]>("/api/public/hospitals/featured", {
    query: { limit },
    signal: options.signal,
  });
}
