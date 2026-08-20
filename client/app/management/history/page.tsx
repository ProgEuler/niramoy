"use client";

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

      <div className="flex-1 p-4 sm:p-6">
        <UpdateHistory hospital={hospital} />
      </div>
    </div>
  );
}
