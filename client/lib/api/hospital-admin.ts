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
