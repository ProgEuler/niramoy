"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getMyHospitalDashboard,
  getMyHospitalProfile,
  type MyHospitalDashboard,
  type MyHospitalProfile,
} from "@/lib/api/hospital-admin";
import { summaryToHospital } from "@/lib/api/hospital-mapper";
import { selectAccessToken, useAuthStore } from "@/lib/auth/store";
import type { Hospital } from "@/lib/types/hospital";

export const myHospitalKeys = {
  all: ["hospital", "me"] as const,
  profile: () => [...myHospitalKeys.all, "profile"] as const,
  dashboard: () => [...myHospitalKeys.all, "dashboard"] as const,
};

export function useMyHospitalDashboard(
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const accessToken = useAuthStore(selectAccessToken);

  const query = useQuery<MyHospitalDashboard, Error>({
    queryKey: myHospitalKeys.dashboard(),
    queryFn: ({ signal }) =>
      getMyHospitalDashboard({ token: accessToken ?? "", signal }),
    enabled: enabled && !!accessToken,
    staleTime: 60 * 1000,
  });

  return {
    dashboard: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function useMyHospitalProfile(
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const accessToken = useAuthStore(selectAccessToken);

  const query = useQuery<MyHospitalProfile, Error>({
    queryKey: myHospitalKeys.profile(),
    queryFn: ({ signal }) =>
      getMyHospitalProfile({ token: accessToken ?? "", signal }),
    enabled: enabled && !!accessToken,
    staleTime: 60 * 1000,
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function dashboardToHospital(
  dashboard: MyHospitalDashboard | null | undefined,
): Hospital | null {
  if (!dashboard) return null;
  const bed = dashboard.bed_availability;

  const detailSummary = {
    id: dashboard.hospital.id,
    name: dashboard.hospital.name,
    address: dashboard.hospital.address,
    district: "",
    division: null as string | null,
    latitude: dashboard.hospital.latitude,
    longitude: dashboard.hospital.longitude,
    is_verified: true,
    is_active: true,
    icu_total: bed?.icu_total ?? 0,
    icu_available: bed?.icu_available ?? 0,
    nicu_total: bed?.nicu_total ?? 0,
    nicu_available: bed?.nicu_available ?? 0,
    ccu_total: bed?.ccu_total ?? 0,
    ccu_available: bed?.ccu_available ?? 0,
    hdu_total: bed?.hdu_total ?? 0,
    hdu_available: bed?.hdu_available ?? 0,
    cost_per_day_icu: bed?.cost_per_day_icu ?? 0,
    cost_per_day_nicu: bed?.cost_per_day_nicu ?? 0,
    cost_per_day_ccu: bed?.cost_per_day_ccu ?? 0,
    cost_per_day_hdu: bed?.cost_per_day_hdu ?? 0,
    average_rating: 0,
    total_reviews: 0,
    last_updated: dashboard.last_updated,
    is_stale: dashboard.is_stale,
    availability_color: null as string | null,
    distance_km: null as number | null,
    is_featured: false,
    description: dashboard.hospital.description,
  };

  const detail = {
    ...detailSummary,
    phone_emergency: dashboard.hospital.phone_emergency,
    phone_general: dashboard.hospital.phone_general,
    description: dashboard.hospital.description,
    photo_url: dashboard.hospital.photo_url,
    created_at: "",
    updated_at: "",
    facilities: [],
    osm_id: null as number | null,
    operator_name: null as string | null,
  };

  return summaryToHospital(detailSummary, detail);
}
