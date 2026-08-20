"use client";

import { UpdateProfileForm } from "@/components/hospital-admin/update-profile-form";
import { MyHospitalData } from "@/components/hospital-admin/my-hospital-data";

export default function ManagementProfilePage() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-muted/20">
      <div className="flex-1 p-4 sm:p-6">
        <MyHospitalData>
          {(hospital) => <UpdateProfileForm hospital={hospital} />}
        </MyHospitalData>
      </div>
    </div>
  );
}