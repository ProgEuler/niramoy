"use client";

import { UpdatePricingForm } from "@/components/hospital-admin/update-pricing-form";
import { MyHospitalData } from "@/components/hospital-admin/my-hospital-data";

export default function ManagementPricingPage() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-muted/20">
      <div className="flex-1 p-4 sm:p-6">
        <MyHospitalData>
          {(hospital) => <UpdatePricingForm hospital={hospital} />}
        </MyHospitalData>
      </div>
    </div>
  );
}