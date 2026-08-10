/**
 * Typed wrappers around all /api/admin/* endpoints.
 *
 * Mirrors the FastAPI system_admin router exactly so types don't drift.
 * Every function accepts a `token` string (pulled from the auth store by
 * the calling hook).
 */

import { api } from "./client";
import type { UserRole } from "./auth";

// ── Shared shapes ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

// ── Hospital shapes ────────────────────────────────────────────────────

export interface AdminHospital {
  id: number;
  name: string;
  address: string;
  district: string;
  division: string | null;
  phone_emergency: string | null;
  phone_general: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  photo_url: string | null;
  is_verified: boolean;
  is_active: boolean;
  osm_id: number | null;
  created_at: string;
  updated_at: string;
  // from bed_availability join
  icu_total: number;
  icu_available: number;
  nicu_total: number;
  nicu_available: number;
  ccu_total: number;
  ccu_available: number;
  hdu_total: number;
  hdu_available: number;
  last_updated: string | null;
  average_rating: number;
  total_reviews: number;
}

export interface AdminHospitalDetail extends AdminHospital {
  facilities: { type: string; total_capacity: number; is_active: boolean }[];
  bed_availability: {
    icu_total: number; icu_available: number;
    nicu_total: number; nicu_available: number;
    ccu_total: number; ccu_available: number;
    hdu_total: number; hdu_available: number;
    cost_per_day_icu: number; cost_per_day_nicu: number;
    cost_per_day_ccu: number; cost_per_day_hdu: number;
    last_updated: string | null;
  } | null;
  assigned_admin: AdminUser[];
  recent_update_history: UpdateHistoryRow[];
}

export interface HospitalUpdatePayload {
  name?: string;
  address?: string;
  phone_emergency?: string | null;
  phone_general?: string | null;
  description?: string | null;
  photo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_verified?: boolean;
  is_active?: boolean;
  district?: string;
}

// ── User shapes ────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  hospital_id: number | null;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface CreateAdminUserPayload {
  username: string;
  email: string;
  password: string;
}

// ── Update history shapes ──────────────────────────────────────────────

export interface UpdateHistoryRow {
  id: number;
  hospital_id: number;
  updated_by_user_id: number | null;
  update_type: string;
  field_name: string | null;
  previous_value: string | null;
  new_value: string | null;
  note: string | null;
  status: "Live" | "Pending" | "Rejected";
  rejection_reason: string | null;
  created_at: string;
}

// ── Hospitals API ──────────────────────────────────────────────────────

export interface ListHospitalsParams {
  page?: number;
  page_size?: number;
  search?: string;
  district?: string;
  is_verified?: boolean;
  is_active?: boolean;
}

export function listHospitals(params: ListHospitalsParams, token: string) {
  return api.get<PaginatedResponse<AdminHospital>>("/api/admin/hospitals", {
    token,
    query: {
      page: params.page ?? 1,
      page_size: params.page_size ?? 25,
      ...(params.search ? { search: params.search } : {}),
      ...(params.district ? { district: params.district } : {}),
      ...(params.is_verified !== undefined ? { is_verified: params.is_verified } : {}),
      ...(params.is_active !== undefined ? { is_active: params.is_active } : {}),
    },
  });
}

export function getHospital(id: number, token: string) {
  return api.get<AdminHospitalDetail>(`/api/admin/hospitals/${id}`, { token });
}

export function verifyHospital(id: number, is_verified: boolean, token: string) {
  return api.patch<{ id: number; is_verified: boolean }>(
    `/api/admin/hospitals/${id}/verify`,
    { is_verified },
    { token },
  );
}

export function suspendHospital(
  id: number,
  payload: { is_suspended: boolean; reason: string },
  token: string,
) {
  return api.patch<{ id: number; is_active: boolean }>(
    `/api/admin/hospitals/${id}/suspend`,
    payload,
    { token },
  );
}

export function updateHospital(
  id: number,
  payload: HospitalUpdatePayload,
  token: string,
) {
  return api.put<{ id: number }>(`/api/admin/hospitals/${id}`, payload, { token });
}

export function deleteHospital(id: number, token: string) {
  return api.delete<void>(`/api/admin/hospitals/${id}`, { token });
}

// ── Users API ──────────────────────────────────────────────────────────

export interface ListUsersParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: UserRole;
  is_active?: boolean;
}

export function listUsers(params: ListUsersParams, token: string) {
  return api.get<PaginatedResponse<AdminUser>>("/api/admin/users", {
    token,
    query: {
      page: params.page ?? 1,
      page_size: params.page_size ?? 25,
      ...(params.search ? { search: params.search } : {}),
      ...(params.role ? { role: params.role } : {}),
      ...(params.is_active !== undefined ? { is_active: params.is_active } : {}),
    },
  });
}

export function suspendUser(
  id: number,
  payload: { is_suspended: boolean; reason: string },
  token: string,
) {
  return api.patch<{ id: number; is_active: boolean }>(
    `/api/admin/users/${id}/suspend`,
    payload,
    { token },
  );
}

export function resetUserPassword(id: number, token: string) {
  return api.patch<{ message: string }>(
    `/api/admin/users/${id}/reset-password`,
    undefined,
    { token },
  );
}

export function createAdminUser(payload: CreateAdminUserPayload, token: string) {
  return api.post<{ id: number; username: string; email: string }>(
    "/api/admin/users",
    payload,
    { token },
  );
}

export function deleteUser(id: number, token: string) {
  return api.delete<void>(`/api/admin/users/${id}`, { token });
}

// ── Updates / Moderation API ───────────────────────────────────────────

export interface ListUpdatesParams {
  page?: number;
  page_size?: number;
  status?: "Live" | "Pending" | "Rejected";
  hospital_id?: number;
  update_type?: string;
}

export function listUpdates(params: ListUpdatesParams, token: string) {
  return api.get<PaginatedResponse<UpdateHistoryRow>>("/api/admin/updates", {
    token,
    query: {
      page: params.page ?? 1,
      page_size: params.page_size ?? 25,
      ...(params.status ? { status: params.status } : {}),
      ...(params.hospital_id ? { hospital_id: params.hospital_id } : {}),
      ...(params.update_type ? { update_type: params.update_type } : {}),
    },
  });
}

export function approveUpdate(id: number, note: string | undefined, token: string) {
  return api.patch<{ id: number; status: string }>(
    `/api/admin/updates/${id}/approve`,
    { note: note ?? null },
    { token },
  );
}

export function rejectUpdate(id: number, reason: string, token: string) {
  return api.patch<{ id: number; status: string }>(
    `/api/admin/updates/${id}/reject`,
    { reason },
    { token },
  );
}

// ── Stats (derived from hospital list) ────────────────────────────────

export interface PlatformStats {
  total_hospitals: number;
  verified_hospitals: number;
  /** count of pending update history rows */
  pending_approval: number;
  /** unverified + active hospitals */
  pending_hospitals: number;
  /** inactive/suspended hospitals */
  suspended_hospitals: number;
  total_icu_beds: number;
  available_icu_beds: number;
  hospitals_stale_over_24h: number;
  total_reviews: number;
  active_admins: number;
}

export interface AvailabilitySummaryRow {
  district_id: number;
  district_name: string;
  hospital_count: number;
  total_beds: number;
  available_beds: number;
}

export interface UpdateFrequencyRow {
  hospital_id: number;
  hospital_name: string;
  update_count: number;
  last_updated: string | null;
  average_interval_hours: number | null;
}

export function getPlatformStats(token: string) {
  return api.get<PlatformStats>("/api/admin/reports/platform-stats", { token });
}

export function getAvailabilitySummary(token: string, bed_type = "icu") {
  return api.get<AvailabilitySummaryRow[]>(
    "/api/admin/reports/availability-summary",
    { token, query: { bed_type } },
  );
}

export function getUpdateFrequency(token: string) {
  return api.get<UpdateFrequencyRow[]>("/api/admin/reports/update-frequency", { token });
}
