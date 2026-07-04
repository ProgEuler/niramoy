"use client";

import { useMemo } from "react";
import Link from "next/link";
import { IconArrowLeft, IconCoin } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { UpdatePricingForm } from "@/components/hospital-admin/update-pricing-form";
import { useHospitalStore } from "@/lib/use-hospital-store";

export default function UpdatePricingPage() {
  const { hospitals } = useHospitalStore();
  const hospital = useMemo(
    () => hospitals.find((h) => h.verified) ?? hospitals[0],
    [hospitals],
  );
  if (!hospital) return null;
  return (
    <>
      <div className="border-b bg-card px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="inline-flex items-center gap-1 rounded-full bg-niramoy-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-niramoy-teal">
              <IconCoin className="size-3" />
              Update Pricing
            </p>
            <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight">
              {hospital.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              Set cost per day in BDT for each bed type.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/hospital">
              <IconArrowLeft className="size-3.5" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <UpdatePricingForm hospital={hospital} />
      </div>
    </>
  );
}
