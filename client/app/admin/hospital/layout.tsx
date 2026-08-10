"use client";

/**
 * Layout for all /admin/hospital/* pages (hospital-admin role).
 *
 * Renders the shared AppShell with the `hospital_admin` nav config and a
 * ToastProvider. The page chrome (sidebar / header) is provided by the
 * shell; this layout only supplies app-wide providers.
 */

import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/app-shell";

export default function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <AppShell role="hospital_admin">{children}</AppShell>
    </ToastProvider>
  );
}