import { api } from "./client";

export interface MyHospitalProfile {
  id: number;
  name: string;
  address: string;
  phone_emergency: string | null;
  phone_general: string | null;
  description: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_at: string | null;
}

export interface AuthedOptions {
  token: string;
  signal?: AbortSignal;
}

export function getMyHospitalProfile({ token, signal }: AuthedOptions) {
  return api.get<MyHospitalProfile>("/api/hospital/profile", {
    token,
    signal,
  });
}

export interface MyHospitalBedAvailability {
  hospital_id: number;
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
  last_updated: string | null;
  is_stale: boolean;
}

export interface MyHospitalDashboard {
  hospital: MyHospitalProfile;
  bed_availability: MyHospitalBedAvailability | null;
  last_updated: string | null;
  is_stale: boolean;
  stale_warning: boolean;
  recent_history: unknown[];
}

export function getMyHospitalDashboard({ token, signal }: AuthedOptions) {
  return api.get<MyHospitalDashboard>("/api/hospital/dashboard", {
    token,
    signal,
  });
}

export interface MyHospitalBedsUpdate {
  icu_available?: number;
  nicu_available?: number;
  ccu_available?: number;
  hdu_available?: number;
  note?: string;
}

export interface MyHospitalBedsUpdateResult {
  status: "live" | "pending";
  updated_at: string | null;
  message: string | null;
}

export function patchMyHospitalBeds(
  payload: MyHospitalBedsUpdate,
  { token, signal }: AuthedOptions,
) {
  return api.patch<MyHospitalBedsUpdateResult>(
    "/api/hospital/beds",
    payload,
    { token, signal },
  );
}

// Pricing

export interface MyHospitalPricingUpdate {
  cost_icu?: number;
  cost_nicu?: number;
  cost_ccu?: number;
  cost_hdu?: number;
}

/**
 * History row from `/api/hospital/history`. Mirrors the backend
 * `UpdateHistoryOut` shape. Used by the pricing form's "Recent price
 * changes" panel.
 */
export interface MyHospitalHistoryRow {
  id: number;
  hospital_id: number;
  updated_by_user_id: number | null;
  /** "BedCount" | "Pricing" | "Profile" */
  update_type: string;
  /** Column name like "cost_per_day_icu". */
  field_name: string | null;
  previous_value: string | null;
  new_value: string | null;
  note: string | null;
  /** "Live" | "Pending" | "Rejected" — only "Live" is shown to admins
   *  for their own history; the moderation queue is platform-admin only. */
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

/**
 * GET /api/hospital/history?update_type=Pricing&page_size=50
 *
 * Returns the admin's own update-history rows. The endpoint is JWT-scoped
 * to the admin's `hospital_id`. Pass `update_type` to filter (Pricing,
 * BedCount, Profile); omit to get all types.
 *
 * `token` is required.
 */
export function getMyHospitalHistory(
  params: { update_type?: string; page_size?: number } = {},
  { token, signal }: AuthedOptions,
) {
  return api.get<{
    data: MyHospitalHistoryRow[];
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  }>("/api/hospital/history", {
    token,
    signal,
    query: {
      ...(params.update_type ? { update_type: params.update_type } : {}),
      page_size: params.page_size ?? 50,
    },
  });
}

export interface MyHospitalPricing {
  cost_per_day_icu: number;
  cost_per_day_nicu: number;
  cost_per_day_ccu: number;
  cost_per_day_hdu: number;
}

export function patchMyHospitalPricing(
  payload: MyHospitalPricingUpdate,
  { token, signal }: AuthedOptions,
) {
  return api.patch<MyHospitalPricing>(
    "/api/hospital/pricing",
    payload,
    { token, signal },
  );
}

// Profile

export interface MyHospitalProfileUpdate {
  address?: string;
  phone_emergency?: string;
  phone_general?: string | null;
  description?: string | null;
  photo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function patchMyHospitalProfile(
  payload: MyHospitalProfileUpdate,
  { token, signal }: AuthedOptions,
) {
  return api.patch<MyHospitalProfile>(
    "/api/hospital/profile",
    payload,
    { token, signal },
  );
}
