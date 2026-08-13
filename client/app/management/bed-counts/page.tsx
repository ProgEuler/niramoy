"use client";

/**
 * PAGE 2 — Update Bed Counts.
 *
 * The most-used page in the portal. Side-by-side available vs total, inline
 * validation, a live change summary, an optional note, and a submit button.
 * Surfaces a moderation notice when the change is large enough to require
 * platform admin sign-off.
 */

import { useMemo } from "react";
import { UpdateBedCountsForm } from "@/components/hospital-admin/update-bed-counts-form";
import { useHospitalStore } from "@/lib/use-hospital-store";
import { useAuth } from "@/lib/auth/use-auth";

export default function ManagementBedCountsPage() {
  const { hospitals } = useHospitalStore();
  const { user } = useAuth();

  const hospital = useMemo(() => {
    if (user?.hospital_id != null) {
      const byId = hospitals.find(
        (h) => String(h.id) === String(user.hospital_id),
      );
      if (byId) return byId;
    }
    return hospitals.find((h) => h.verified) ?? hospitals[0];
  }, [hospitals, user]);

  if (!hospital) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No hospital linked to this account yet.
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-muted/20">
      <div className="border-b bg-card px-4 py-3 sm:px-6">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Update bed counts
        </h1>
        <p className="text-xs text-muted-foreground">
          Change available vs total capacity for {hospital.name}. Patients see
          updates live.
        </p>
      </div>

      <div className="flex-1 p-4 sm:p-6">
        <UpdateBedCountsForm hospital={hospital} />
      </div>
    </div>
  );
}
