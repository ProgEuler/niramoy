"use client";

/**
 * TanStack Query hook for the single-hospital detail endpoint.
 *
 * Resolves the URL slug (e.g. `eos-qui-et-et-molli-5`) to a numeric
 * backend id, fetches `/api/public/hospitals/{id}`, and maps the response
 * to the UI `Hospital` shape so the existing detail components can render
 * it without changes.
 *
 * Falls back to the static-JSON store when the slug has no numeric suffix
 * (legacy seed data like `dmch-dhaka`) so existing links don't break.
 */

import { useQuery } from "@tanstack/react-query";

import { getHospitalById, type HospitalDetail } from "@/lib/api/hospitals";
import {
  parseSlugId,
  summaryToHospital,
} from "@/lib/api/hospital-mapper";
import rawHospitals from "@/data/hospitals.json";
import type { Hospital } from "@/lib/types/hospital";

const SEED_HOSPITALS: Hospital[] = rawHospitals as Hospital[];

export const hospitalDetailKeys = {
  all: ["hospitals", "detail"] as const,
  detail: (slug: string) => [...hospitalDetailKeys.all, slug] as const,
};

function findSeedBySlug(slug: string): Hospital | undefined {
  return SEED_HOSPITALS.find((h) => h.id === slug);
}

export interface UseHospitalDetailResult {
  hospital: Hospital | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch a single hospital by its URL slug.
 *
 * - If the slug has a numeric backend-id suffix, calls the live API.
 * - Otherwise falls back to the static JSON seed (legacy slugs).
 */
export function useHospitalDetail(slug: string | undefined): UseHospitalDetailResult {
  const id = slug ? parseSlugId(slug) : null;

  // Legacy seed slug — no live API call needed.
  const seedHospital = slug && id === null ? findSeedBySlug(slug) : undefined;

  const query = useQuery<Hospital, Error>({
    queryKey: hospitalDetailKeys.detail(slug ?? ""),
    enabled: id !== null,
    queryFn: async ({ signal }) => {
      const detail: HospitalDetail = await getHospitalById(id!, { signal });
      // `summaryToHospital` accepts a HospitalSummary (which HospitalDetail
      // extends) plus an optional detail-level enrichment.
      return summaryToHospital(detail, detail);
    },
    // 30s — detail pages aren't a tight loop like search.
    staleTime: 30 * 1000,
  });

  if (seedHospital) {
    return {
      hospital: seedHospital,
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => {},
    };
  }

  return {
    hospital: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
