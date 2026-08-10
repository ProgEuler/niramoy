"use client";

/**
 * Layout for `/management` (hospital-admin portal).
 *
 * Mounts the shared AppShell with the `hospital_admin` nav config and gates
 * access behind an `<AuthGuard>` so only signed-in hospital admins see it.
 */

import { ToastProvider } from "@/components/ui/toast";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRole="hospital_admin">
      <ToastProvider>
        <AppShell role="hospital_admin">{children}</AppShell>
      </ToastProvider>
    </AuthGuard>
  );
}