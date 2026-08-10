/**
 * Auth store — Zustand. Persists tokens + the user snapshot to
 * `localStorage` so a page refresh keeps you signed in.
 *
 * Tokens are also kept in `localStorage` (not just cookies) because the
 * backend uses bearer auth. SSR-safe: `persist` skips rehydration until the
 * client is mounted, so server-rendered pages don't see stale state.
 */

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { CurrentUser, TokenPair, UserRole } from "@/lib/api/auth";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  user: CurrentUser | null;
  hydrated: boolean;

  setSession: (tokens: TokenPair, user?: CurrentUser | null) => void;
  setUser: (user: CurrentUser | null) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      hydrated: false,

      setSession: (tokens, user = null) =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_at,
          user,
        }),
      setUser: (user) => set({ user }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          user: null,
        }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "niramoy.auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark hydrated after persist finishes (or immediately if SSR).
        state?.setHydrated();
      },
    },
  ),
);

// ── Selectors / helpers ────────────────────────────────────────────────

export const selectIsAuthed = (s: AuthState) => Boolean(s.accessToken);
export const selectUserRole = (s: AuthState): UserRole | null =>
  s.user?.role ?? null;
export const selectHospitalId = (s: AuthState) => s.user?.hospital_id ?? null;
export const selectAccessToken = (s: AuthState) => s.accessToken;