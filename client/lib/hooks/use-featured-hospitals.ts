"use client";

/**
 * TanStack Query hook for the curated landing-page featured list.
 *
 * The backend already filters to verified+active rows with `is_featured
 * = true` and sorts by `updated_at desc`, so the hook is a thin wrapper
 * that maps the snake_case backend summary to the UI `Hospital` shape.
 *
 * The query is kept separate from the public search query so that
 * featured-list updates don't invalidate the main search cache.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getFeaturedHospitals, type HospitalSummary } from "@/lib/api/hospitals";
import { summariesToHospitals } from "@/lib/api/hospital-mapper";
import type { Hospital } from "@/lib/types/hospital";

export const featuredHospitalsKeys = {
  all: ["hospitals", "featured"] as const,
  list: (limit: number) => [...featuredHospitalsKeys.all, limit] as const,
};

export interface UseFeaturedHospitalsResult {
  /** UI-shaped hospitals, ready to feed into `FeaturedCard`. */
  hospitals: Hospital[];
  /** Raw summaries — exposed so the loader can render skeletons with
   *  the same shape as the real list. */
  summaries: HospitalSummary[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  refetch: () => void;
}

export function useFeaturedHospitals(
  limit: number = 8,
  options: { enabled?: boolean } = {}
): UseFeaturedHospitalsResult {
  const { enabled = true } = options;

  const query = useQuery<HospitalSummary[], Error>({
    queryKey: featuredHospitalsKeys.list(limit),
    queryFn: ({ signal }) =>
      getFeaturedHospitals(limit, { signal }),
    enabled,
    // Featured content turns over slowly; 5 minutes keeps the landing
    // page hot without re-hitting the backend on every tab focus.
    staleTime: 5 * 60 * 1000,
  });

  const summaries = query.data ?? [];
  const hospitals = useMemo(
    () => summariesToHospitals(summaries),
    [summaries]
  );

  return {
    hospitals,
    summaries,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
