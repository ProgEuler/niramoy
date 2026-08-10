/**
 * TanStack Query hooks for auth. Thin wrappers over the typed API client.
 *
 * Conventions:
 *  - mutations live alongside their query keys
 *  - on success, the mutation writes tokens into the Zustand store
 *  - query keys are namespaced as `["auth", ...]`
 */

"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";

import {
  forgotPassword as apiForgotPassword,
  login as apiLogin,
  me as apiMe,
  refresh as apiRefresh,
  registerHospital as apiRegisterHospital,
  registerHospitalProfile as apiRegisterHospitalProfile,
  registerUser as apiRegisterUser,
  resetPassword as apiResetPassword,
  type CurrentUser,
  type HospitalRegisterPayload,
  type HospitalRegisterResponse,
  type RegistrationPayload,
  type TokenPair,
  type UserRegisterPayload,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";

// ── Query keys ─────────────────────────────────────────────────────────

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

// ── Current user ───────────────────────────────────────────────────────

export function useCurrentUser() {
  const token = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);
  return useQuery<CurrentUser, ApiError>({
    queryKey: authKeys.me(),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const u = await apiMe(token as string);
        if (useAuthStore.getState().user?.id !== u.id) {
          setUser(u);
        }
        return u;
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clear();
        }
        throw err;
      }
    },
  });
}

// ── Login ──────────────────────────────────────────────────────────────

export function useLogin(
  options?: UseMutationOptions<
    TokenPair,
    ApiError,
    { email: string; password: string }
  >,
) {
  const writeSession = useWriteSession();
  return useMutation<
    TokenPair,
    ApiError,
    { email: string; password: string }
  >({
    mutationFn: (input) => apiLogin(input),
    onSuccess: (data, vars, ctx, mutation) => {
      writeSession(data);
      options?.onSuccess?.(data, vars, ctx, mutation);
    },
    ...options,
  });
}

// ── Step 1: Register user account ─────────────────────────────────────

export function useRegisterUser(
  options?: UseMutationOptions<TokenPair, ApiError, UserRegisterPayload>,
) {
  const writeSession = useWriteSession();
  return useMutation<TokenPair, ApiError, UserRegisterPayload>({
    mutationFn: (payload) => apiRegisterUser(payload),
    onSuccess: (data, vars, ctx, mutation) => {
      writeSession(data);
      options?.onSuccess?.(data, vars, ctx, mutation);
    },
    ...options,
  });
}

// ── Step 2: Register hospital profile ────────────────────────────────

export function useRegisterHospitalProfile(
  options?: UseMutationOptions<
    HospitalRegisterResponse,
    ApiError,
    HospitalRegisterPayload
  >,
) {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  return useMutation<HospitalRegisterResponse, ApiError, HospitalRegisterPayload>({
    mutationFn: (payload) => apiRegisterHospitalProfile(payload, token ?? ""),
    onSuccess: (data, vars, ctx, mutation) => {
      // Invalidate /me so hospital_id + hospital_is_verified refresh.
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      options?.onSuccess?.(data, vars, ctx, mutation);
    },
    ...options,
  });
}

// ── Legacy combined registration ──────────────────────────────────────

export function useRegisterHospital(
  options?: UseMutationOptions<
    Awaited<ReturnType<typeof apiRegisterHospital>>,
    ApiError,
    RegistrationPayload
  >,
) {
  return useMutation<
    Awaited<ReturnType<typeof apiRegisterHospital>>,
    ApiError,
    RegistrationPayload
  >({
    mutationFn: (payload) => apiRegisterHospital(payload),
    ...options,
  });
}

// ── Forgot / reset password ────────────────────────────────────────────

export function useForgotPassword() {
  return useMutation<{ message: string }, ApiError, { email: string }>({
    mutationFn: ({ email }) => apiForgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation<
    { message: string },
    ApiError,
    { token: string; new_password: string }
  >({
    mutationFn: (input) => apiResetPassword(input),
  });
}

// ── Refresh ────────────────────────────────────────────────────────────

export function useRefreshToken() {
  const writeSession = useWriteSession();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  return useMutation<TokenPair, ApiError, void>({
    mutationFn: async () => {
      if (!refreshToken) {
        throw new ApiError(401, "No refresh token available");
      }
      return apiRefresh(refreshToken);
    },
    onSuccess: (data) => writeSession(data),
  });
}

// ── Internal helpers ──────────────────────────────────────────────────

function useWriteSession() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  return (tokens: TokenPair) => {
    setSession(tokens);
    queryClient.invalidateQueries({ queryKey: authKeys.me() });
  };
}

// ── Logout ─────────────────────────────────────────────────────────────

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  return () => {
    clear();
    queryClient.clear();
  };
}
