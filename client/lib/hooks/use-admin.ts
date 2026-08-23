"use client";

/**
 * TanStack Query hooks for all /api/admin/* endpoints.
 *
 * Naming conventions:
 *   useAdmin<Resource>     — paginated list query
 *   useAdmin<Resource>Detail — single-item query
 *   useAdmin<Action>       — mutation
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import {
  approveUpdate,
  createAdminUser,
  createHospital,
  deleteHospital,
  deleteUser,
  getAvailabilitySummary,
  getHospital,
  getPlatformStats,
  getUpdateFrequency,
  listHospitals,
  listUpdates,
  listUsers,
  rejectUpdate,
  resetUserPassword,
  suspendHospital,
  suspendUser,
  updateHospital,
  verifyHospital,
  type AdminHospital,
  type AdminHospitalDetail,
  type AdminUser,
  type AvailabilitySummaryRow,
  type CreateAdminUserPayload,
  type HospitalCreatePayload,
  type HospitalUpdatePayload,
  type ListHospitalsParams,
  type ListUpdatesParams,
  type ListUsersParams,
  type PaginatedResponse,
  type PlatformStats,
  type UpdateFrequencyRow,
  type UpdateHistoryRow,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";

// ── Query keys ─────────────────────────────────────────────────────────

export const adminKeys = {
  all: ["admin"] as const,
  hospitals: (p: ListHospitalsParams) => ["admin", "hospitals", p] as const,
  hospital: (id: number) => ["admin", "hospitals", id] as const,
  users: (p: ListUsersParams) => ["admin", "users", p] as const,
  updates: (p: ListUpdatesParams) => ["admin", "updates", p] as const,
  stats: () => ["admin", "stats"] as const,
};

// ── Token helper ───────────────────────────────────────────────────────

function useToken() {
  return useAuthStore((s) => s.accessToken) ?? "";
}

// ── Platform stats ─────────────────────────────────────────────────────

export function useAdminStats(
  opts?: Partial<UseQueryOptions<PlatformStats, ApiError>>,
) {
  const token = useToken();
  return useQuery<PlatformStats, ApiError>({
    queryKey: adminKeys.stats(),
    queryFn: () => getPlatformStats(token),
    staleTime: 60_000,
    enabled: Boolean(token),
    ...opts,
  });
}

// ── Hospitals list ─────────────────────────────────────────────────────

export function useAdminHospitals(
  params: ListHospitalsParams,
  opts?: Partial<UseQueryOptions<PaginatedResponse<AdminHospital>, ApiError>>,
) {
  const token = useToken();
  return useQuery<PaginatedResponse<AdminHospital>, ApiError>({
    queryKey: adminKeys.hospitals(params),
    queryFn: () => listHospitals(params, token),
    staleTime: 30_000,
    enabled: Boolean(token),
    placeholderData: (prev) => prev,
    ...opts,
  });
}

// ── Single hospital detail ─────────────────────────────────────────────

export function useAdminHospitalDetail(
  id: number,
  opts?: Partial<UseQueryOptions<AdminHospitalDetail, ApiError>>,
) {
  const token = useToken();
  return useQuery<AdminHospitalDetail, ApiError>({
    queryKey: adminKeys.hospital(id),
    queryFn: () => getHospital(id, token),
    staleTime: 30_000,
    enabled: Boolean(token) && id > 0,
    ...opts,
  });
}

// ── Verify hospital ────────────────────────────────────────────────────

export function useVerifyHospital(
  opts?: UseMutationOptions<
    { id: number; is_verified: boolean },
    ApiError,
    { id: number; is_verified: boolean }
  >,
) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_verified }) => verifyHospital(id, is_verified, token),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "hospitals"] });
      qc.invalidateQueries({ queryKey: adminKeys.hospital(vars.id) });
      qc.invalidateQueries({ queryKey: adminKeys.stats() });
    },
    ...opts,
  });
}

// ── Suspend hospital ───────────────────────────────────────────────────

export function useSuspendHospital(
  opts?: UseMutationOptions<
    { id: number; is_active: boolean },
    ApiError,
    { id: number; is_suspended: boolean; reason: string }
  >,
) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_suspended, reason }) =>
      suspendHospital(id, { is_suspended, reason }, token),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "hospitals"] });
      qc.invalidateQueries({ queryKey: adminKeys.hospital(vars.id) });
      qc.invalidateQueries({ queryKey: adminKeys.stats() });
    },
    ...opts,
  });
}

// ── Update hospital ────────────────────────────────────────────────────

export function useUpdateHospital(
  opts?: UseMutationOptions<
    { id: number },
    ApiError,
    { id: number; payload: HospitalUpdatePayload }
  >,
) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateHospital(id, payload, token),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "hospitals"] });
      qc.invalidateQueries({ queryKey: adminKeys.hospital(vars.id) });
    },
    ...opts,
  });
}

// ── Delete hospital ────────────────────────────────────────────────────

export function useDeleteHospital(
  opts?: UseMutationOptions<void, ApiError, number>,
) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteHospital(id, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "hospitals"] });
      qc.invalidateQueries({ queryKey: adminKeys.stats() });
    },
    ...opts,
  });
}

// ── Create hospital ────────────────────────────────────────────────────

export function useCreateHospital(
  opts?: Partial<
    UseMutationOptions<
      { id: number; name: string },
      ApiError,
      HospitalCreatePayload
    >
  >,
) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createHospital(payload, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "hospitals"] });
      qc.invalidateQueries({ queryKey: adminKeys.stats() });
    },
    ...opts,
  });
}

// ── Users list ─────────────────────────────────────────────────────────

export function useAdminUsers(
  params: ListUsersParams,
  opts?: Partial<UseQueryOptions<PaginatedResponse<AdminUser>, ApiError>>,
) {
  const token = useToken();
  return useQuery<PaginatedResponse<AdminUser>, ApiError>({
    queryKey: adminKeys.users(params),
    queryFn: () => listUsers(params, token),
    staleTime: 30_000,
    enabled: Boolean(token),
    placeholderData: (prev) => prev,
    ...opts,
  });
}

// ── Suspend user ───────────────────────────────────────────────────────

export function useSuspendUser(
  opts?: UseMutationOptions<
    { id: number; is_active: boolean },
    ApiError,
    { id: number; is_suspended: boolean; reason: string }
  >,
) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_suspended, reason }) =>
      suspendUser(id, { is_suspended, reason }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    ...opts,
  });
}

// ── Reset user password ────────────────────────────────────────────────

export function useResetUserPassword(
  opts?: UseMutationOptions<{ message: string }, ApiError, number>,
) {
  const token = useToken();
  return useMutation({
    mutationFn: (id) => resetUserPassword(id, token),
    ...opts,
  });
}

// ── Create admin user ──────────────────────────────────────────────────

export function useCreateAdminUser(
  opts?: UseMutationOptions<
    { id: number; username: string; email: string },
    ApiError,
    CreateAdminUserPayload
  >,
) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createAdminUser(payload, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    ...opts,
  });
}

// ── Delete user ────────────────────────────────────────────────────────

export function useDeleteUser(
  opts?: UseMutationOptions<void, ApiError, number>,
) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteUser(id, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    ...opts,
  });
}

// ── Updates / moderation ───────────────────────────────────────────────

export function useAdminUpdates(
  params: ListUpdatesParams,
  opts?: Partial<UseQueryOptions<PaginatedResponse<UpdateHistoryRow>, ApiError>>,
) {
  const token = useToken();
  return useQuery<PaginatedResponse<UpdateHistoryRow>, ApiError>({
    queryKey: adminKeys.updates(params),
    queryFn: () => listUpdates(params, token),
    staleTime: 15_000,
    enabled: Boolean(token),
    placeholderData: (prev) => prev,
    ...opts,
  });
}

// ── Approve update ─────────────────────────────────────────────────────

export function useApproveUpdate(
  opts?: UseMutationOptions<
    { id: number; status: string },
    ApiError,
    { id: number; note?: string }
  >,
) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }) => approveUpdate(id, note, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "updates"] });
    },
    ...opts,
  });
}

// ── Reject update ──────────────────────────────────────────────────────

export function useRejectUpdate(
  opts?: UseMutationOptions<
    { id: number; status: string },
    ApiError,
    { id: number; reason: string }
  >,
) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => rejectUpdate(id, reason, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "updates"] });
    },
    ...opts,
  });
}

// ── Availability summary ───────────────────────────────────────────────

export function useAvailabilitySummary(
  bed_type = "icu",
  opts?: Partial<UseQueryOptions<AvailabilitySummaryRow[], ApiError>>,
) {
  const token = useToken();
  return useQuery<AvailabilitySummaryRow[], ApiError>({
    queryKey: ["admin", "availability-summary", bed_type],
    queryFn: () => getAvailabilitySummary(token, bed_type),
    staleTime: 60_000,
    enabled: Boolean(token),
    ...opts,
  });
}

// ── Update frequency ───────────────────────────────────────────────────

export function useUpdateFrequency(
  opts?: Partial<UseQueryOptions<UpdateFrequencyRow[], ApiError>>,
) {
  const token = useToken();
  return useQuery<UpdateFrequencyRow[], ApiError>({
    queryKey: ["admin", "update-frequency"],
    queryFn: () => getUpdateFrequency(token),
    staleTime: 60_000,
    enabled: Boolean(token),
    ...opts,
  });
}
