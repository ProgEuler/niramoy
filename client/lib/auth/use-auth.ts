/**
 * Convenience composable that bundles together everything auth-related:
 *   - the Zustand-backed state (tokens, current user snapshot)
 *   - the TanStack "me" query (always-fresh user, refreshes on focus)
 *   - a `signOut` helper
 *   - role helpers
 *
 * Components should normally just import this and not touch the store or
 * query keys directly.
 */

"use client";

import { useMemo } from "react";

import { useAuthStore, selectIsAuthed, selectUserRole, selectHospitalId } from "./store";
import { useCurrentUser, useLogout } from "./hooks";
import type { CurrentUser, UserRole } from "@/lib/api/auth";

export interface UseAuthResult {
  isAuthed: boolean;
  isLoading: boolean;
  hydrated: boolean;
  user: CurrentUser | null;
  role: UserRole | null;
  hospitalId: number | null;
  /** null = no hospital yet; false = pending review; true = verified */
  hospitalIsVerified: boolean | null;
  accessToken: string | null;
  refreshToken: string | null;
  signOut: () => void;
}

export function useAuth(): UseAuthResult {
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const storeUser = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthed = useAuthStore(selectIsAuthed);
  const role = useAuthStore(selectUserRole);
  const hospitalId = useAuthStore(selectHospitalId);

  const meQuery = useCurrentUser();
  const signOut = useLogout();

  // Prefer the freshest user from the query, fall back to the persisted snapshot.
  const user = meQuery.data ?? storeUser;
  const hospitalIsVerified = user?.hospital_is_verified ?? null;

  return useMemo(
    () => ({
      isAuthed,
      isLoading: meQuery.isLoading,
      hydrated,
      user,
      role,
      hospitalId,
      hospitalIsVerified,
      accessToken,
      refreshToken,
      signOut,
    }),
    [
      isAuthed,
      meQuery.isLoading,
      hydrated,
      user,
      role,
      hospitalId,
      hospitalIsVerified,
      accessToken,
      refreshToken,
      signOut,
    ],
  );
}
