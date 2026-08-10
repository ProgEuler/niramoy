"use client";

/**
 * Layout for all /admin/* pages (system-admin role).
 *
 * Mounts the shared AppShell with the `system_admin` nav config and gates
 * access behind an `<AuthGuard>` so unauthenticated visitors are sent to
 * `/login`. ToastProvider lets any child page fire toasts.
 */

import { ToastProvider } from "@/components/ui/toast";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";

export default function SysAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requiredRole="system_admin" requireVerifiedHospital={false}>
      <ToastProvider>
        <AppShell role="system_admin">{children}</AppShell>
      </ToastProvider>
    </AuthGuard>
  );
}