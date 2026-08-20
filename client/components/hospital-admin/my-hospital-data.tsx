"use client";

/**
 * Live-data wrapper for the management pages.
 *
 * The legacy `/management/*` pages used `useHospitalStore()`, which is
 * seeded from the static `hospitals.json` and never re-reads after
 * edits — so a hospital admin who updates their address, prices, or
 * pin location sees the OLD values on the next visit because the form
 * re-mounts with the static snapshot.
 *
 * This wrapper fetches the signed-in admin's own hospital from
 * `/api/hospital/dashboard` instead, so edits propagate within the
 * same session. It also invalidates that key from every form's
 * mutation, which means the next render of these pages picks up
 * fresh data.
 */

import type { ReactNode } from "react";
import { useMyHospitalDashboard } from "@/lib/hooks/use-my-hospital";
import { dashboardToHospital } from "@/lib/hooks/use-my-hospital";
import type { Hospital } from "@/lib/types/hospital";

export interface MyHospitalDataProps {
  children: (hospital: Hospital) => ReactNode;
}

/**
 * Renders `children(hospital)` once the admin's own hospital has
 * loaded. Shows a compact loading skeleton while the dashboard query
 * is in flight, an error card on failure, and a friendly empty state
 * when the JWT doesn't resolve to a hospital row.
 */
export function MyHospitalData({ children }: MyHospitalDataProps) {
  const { dashboard, isLoading, isError, error } = useMyHospitalDashboard();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Loading your hospital…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center text-sm text-destructive">
        {error?.message ?? "Couldn't load your hospital."}
      </div>
    );
  }

  const hospital = dashboardToHospital(dashboard);
  if (!hospital) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No hospital linked to this account yet.
      </div>
    );
  }

  return <>{children(hospital)}</>;
}