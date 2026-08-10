"use client";

import Link from "next/link";
import { IconArrowLeft, IconDatabase } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ReferenceDataPanel } from "@/components/sysadmin/reference-data";
import { useAmbulanceStore } from "@/lib/use-ambulance-store";

export default function ReferenceDataPage() {
  const { ambulances } = useAmbulanceStore();

  return (
    <>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <ReferenceDataPanel ambulances={ambulances} />
      </div>
    </>
  );
}
