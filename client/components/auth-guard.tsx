"use client";

/**
 * `<AuthGuard>` — client-side guard for protected routes.
 *
 * Waits for the Zustand auth store to hydrate from `localStorage`, then
 * either:
 *   - redirects to `/login` when there is no access token,
 *   - redirects to `/login` when the role doesn't match,
 *   - redirects hospital_admins to `/pending-approval` when not yet verified,
 *   - renders children otherwise.
 */

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/use-auth";
import { ROUTES, homeRouteFor, isRoleAtLeast } from "@/lib/auth/guards";
import type { UserRole } from "@/lib/api/auth";

export interface AuthGuardProps {
  children: ReactNode;
  /** Required role(s). If omitted, any signed-in user passes. */
  requiredRole?: UserRole | UserRole[];
  /**
   * When true (default), hospital_admins without a verified hospital are
   * redirected to /pending-approval instead of being let through.
   */
  requireVerifiedHospital?: boolean;
}

export function AuthGuard({
  children,
  requiredRole,
  requireVerifiedHospital = true,
}: AuthGuardProps) {
  const router = useRouter();
  const { hydrated, isAuthed, role, hospitalId, hospitalIsVerified, isLoading } =
    useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthed) {
      router.replace(ROUTES.login);
      return;
    }
    if (!isRoleAtLeast(role, requiredRole)) {
      router.replace(
        homeRouteFor(role, {
          hasHospital: hospitalId != null,
          hospitalIsVerified,
        }),
      );
      return;
    }
    // Extra guard for hospital admins: if verification is required and their
    // hospital is not yet verified, redirect them to the pending page.
    if (
      requireVerifiedHospital &&
      role === "hospital_admin" &&
      hospitalId == null
    ) {
      router.replace(ROUTES.registerHospital);
      return;
    }
    if (
      requireVerifiedHospital &&
      role === "hospital_admin" &&
      hospitalIsVerified === false
    ) {
      router.replace(ROUTES.pendingApproval);
    }
  }, [
    hydrated,
    isAuthed,
    role,
    hospitalId,
    hospitalIsVerified,
    requiredRole,
    requireVerifiedHospital,
    router,
  ]);

  if (!hydrated || (!isAuthed && !isLoading)) {
    return null;
  }

  if (isAuthed && !isRoleAtLeast(role, requiredRole)) {
    return null;
  }

  // Block render while waiting for verification info.
  if (
    requireVerifiedHospital &&
    role === "hospital_admin" &&
    hospitalIsVerified === false
  ) {
    return null;
  }

  return children;
}
