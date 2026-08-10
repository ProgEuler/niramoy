/**
 * TanStack hooks for divisions + districts (reference data).
 */

"use client";

import { useQuery } from "@tanstack/react-query";

import {
  listDivisions,
  listDistricts,
  type District,
  type Division,
} from "@/lib/api/geo";

export const geoKeys = {
  all: ["geo"] as const,
  divisions: () => [...geoKeys.all, "divisions"] as const,
  districts: (divisionId?: number) =>
    [...geoKeys.all, "districts", divisionId ?? "all"] as const,
};

export function useDivisions() {
  return useQuery<Division[]>({
    queryKey: geoKeys.divisions(),
    queryFn: listDivisions,
    staleTime: 60 * 60 * 1000, // divisions rarely change
  });
}

export function useDistrictsByDivision(divisionId?: number) {
  return useQuery<District[]>({
    queryKey: geoKeys.districts(divisionId),
    queryFn: () => listDistricts(divisionId),
    enabled: divisionId !== undefined,
    staleTime: 60 * 60 * 1000,
  });
}
