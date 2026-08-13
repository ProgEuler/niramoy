"use client";

/**
 * PAGE 5 — Update History.
 *
 * Full audit log of every change this hospital has ever made through the
 * portal. Filter by date range and by type; export the filtered set as CSV.
 * Status badges (Live / Pending / Rejected) make moderation state obvious;
 * rejected rows expose the rejection reason inline.
 */

import { useMemo } from "react";
import { UpdateHistory } from "@/components/hospital-admin/update-history";
import { useHospitalStore } from "@/lib/use-hospital-store";
import { useAuth } from "@/lib/auth/use-auth";

export default function ManagementHistoryPage() {
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
          Update history
        </h1>
        <p className="text-xs text-muted-foreground">
          Full audit log for {hospital.name}. Filter by date and type, or
          export to CSV.
        </p>
      </div>

      <div className="flex-1 p-4 sm:p-6">
        <UpdateHistory hospital={hospital} />
      </div>
    </div>
  );
}