"use client";

/**
 * TanStack Query hook for the public hospital search.
 *
 * Owns the query key + the network call. The page consumes the returned
 * `hospitals` (already mapped to the UI `Hospital` shape) and the
 * `isLoading` / `error` derived fields.
 *
 * The backend's `/api/public/search` only accepts a single `bed_type` and
 * a `district` (not division). The page translates the UI's filter state
 * into backend params before calling this hook. The hook itself is a thin
 * layer that adds cache + retries + abort-on-unmount.
 *
 * Multi-bed selection and division filtering are handled by the page's
 * client-side filter reducer (`applyFilters`) on the API result set. This
 * gives us a single, predictable fetch path and keeps the UI responsive
 * while users adjust filters.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  searchHospitals,
  UI_TO_BACKEND_SORT,
  type HospitalSearchParams,
  type HospitalSummary,
  type SearchSortBy,
} from "@/lib/api/hospitals";
import { summariesToHospitals } from "@/lib/api/hospital-mapper";
import type { Hospital } from "@/lib/types/hospital";

export const hospitalSearchKeys = {
  all: ["hospitals", "search"] as const,
  search: (params: HospitalSearchParams) =>
    [...hospitalSearchKeys.all, params] as const,
};

/**
 * Map a UI sort key to the backend's `sort_by` enum. Defaults to
 * "most_available" which matches the rest of the app's default ordering.
 */
export function sortToBackendSort(uiSort: string): SearchSortBy {
  return UI_TO_BACKEND_SORT[uiSort] ?? "most_available";
}

export interface UseHospitalSearchOptions {
  /** API params, fully resolved. Pass `{}` to fetch everything. */
  params: HospitalSearchParams;
  /** Disable the query (e.g. while waiting on geolocation). */
  enabled?: boolean;
}

export interface UseHospitalSearchResult {
  /** UI-shaped hospitals, ready to feed `applyFilters`. */
  hospitals: Hospital[];
  /** Raw summaries in case the caller needs extra fields (distance, etc.). */
  summaries: HospitalSummary[];
  /** Total server count across all pages. */
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  /** Manually re-run the query (e.g. on a "Try again" button). */
  refetch: () => void;
}

export function useHospitalSearch(
  options: UseHospitalSearchOptions
): UseHospitalSearchResult {
  const { params, enabled = true } = options;

  const query = useQuery<HospitalSummary[], Error>({
    queryKey: hospitalSearchKeys.search(params),
    queryFn: ({ signal }) =>
      searchHospitals(params, { signal }).then((r) => r.data),
    enabled,
    // 60s keeps the list fresh while still feeling instant on filter
    // changes — most public users won't dwell longer than that.
    staleTime: 60 * 1000,
    // Keep previous results on screen while the next filter request is
    // in flight. Critical for the "did anything happen?" UX during
    // filter changes.
    placeholderData: (prev) => prev,
  });

  const summaries = query.data ?? [];
  const hospitals = useMemo(
    () => summariesToHospitals(summaries),
    [summaries]
  );

  return {
    hospitals,
    summaries,
    totalCount: summaries.length,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
