"use client";

/**
 * PAGE 3 — Update Pricing.
 *
 * Cost per day in BDT for each bed type. Changes less frequently than bed
 * counts. Public hospitals typically leave this at ৳0 (free).
 */

import { useMemo } from "react";
import { UpdatePricingForm } from "@/components/hospital-admin/update-pricing-form";
import { useHospitalStore } from "@/lib/use-hospital-store";
import { useAuth } from "@/lib/auth/use-auth";

export default function ManagementPricingPage() {
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
          Update pricing
        </h1>
        <p className="text-xs text-muted-foreground">
          Set the cost per day in BDT for {hospital.name}. Public hospitals
          typically set ৳0 (free).
        </p>
      </div>

      <div className="flex-1 p-4 sm:p-6">
        <UpdatePricingForm hospital={hospital} />
      </div>
    </div>
  );
}
