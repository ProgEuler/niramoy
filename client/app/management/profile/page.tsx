"use client";

/**
 * PAGE 4 — Hospital Profile.
 *
 * Address, phones, description, photo upload, and a draggable map pin for
 * correcting the location shown on the public page. Hospital name, division,
 * and district are locked (those change via system admin re-verification).
 */

import { useMemo } from "react";
import { UpdateProfileForm } from "@/components/hospital-admin/update-profile-form";
import { useHospitalStore } from "@/lib/use-hospital-store";
import { useAuth } from "@/lib/auth/use-auth";

export default function ManagementProfilePage() {
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
          Hospital profile
        </h1>
        <p className="text-xs text-muted-foreground">
          Update {hospital.name}&rsquo;s contact info, description, photo, and
          map pin. Hospital name can&rsquo;t be changed here — contact a system
          admin.
        </p>
      </div>

      <div className="flex-1 p-4 sm:p-6">
        <UpdateProfileForm hospital={hospital} />
      </div>
    </div>
  );
}