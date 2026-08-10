/**
 * Route-guard helpers. Used by server-component or `useEffect`-based
 * redirects.
 *
 * Examples:
 *   - requireRole("system_admin", ROUTES.login)
 *   - requireRole(["hospital_admin", "system_admin"], ROUTES.login)
 *
 * The actual navigation happens at the call site (typically a `useEffect`
 * that calls `router.replace(target)` once auth state is hydrated).
 */

import type { UserRole } from "@/lib/api/auth";

export const ROUTES = {
  login: "/login",
  register: "/register",
  registerHospital: "/register-hospital",
  pendingApproval: "/pending-approval",
  home: "/",
  admin: "/admin",
  management: "/management",
} as const;

export function homeRouteFor(
  role: UserRole | null | undefined,
  opts?: {
    /** Whether the user has a hospital_id set (step 2 complete) */
    hasHospital?: boolean;
    /** Whether that hospital is verified */
    hospitalIsVerified?: boolean | null;
  },
): string {
  switch (role) {
    case "system_admin":
      return ROUTES.admin;
    case "hospital_admin": {
      // No hospital registered yet — send to step 2.
      if (opts?.hasHospital === false) return ROUTES.registerHospital;
      // Hospital registered but not yet approved.
      if (opts?.hospitalIsVerified === false) return ROUTES.pendingApproval;
      // Verified — full dashboard access.
      return ROUTES.management;
    }
    default:
      return ROUTES.home;
  }
}

export function isRoleAtLeast(
  actual: UserRole | null | undefined,
  required: UserRole | UserRole[] | undefined,
): boolean {
  if (!required) return true;
  if (!actual) return false;
  const allowed = Array.isArray(required) ? required : [required];
  return allowed.includes(actual);
}
