"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconShieldCog,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { SysAdminOverview } from "@/components/sysadmin/sysadmin-overview";
import { useHospitalStore } from "@/lib/use-hospital-store";

export default function SysAdminPage() {
  const { hospitals } = useHospitalStore();

  return (
    <>
      <div className="border-b bg-card px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="inline-flex items-center gap-1 rounded-full bg-niramoy-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-niramoy-teal">
              <IconShieldCog className="size-3" />
              System Admin
            </p>
            <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight">
              Platform overview
            </h1>
            <p className="text-xs text-muted-foreground">
              Health of the entire Niramoy network — hospitals, data freshness,
              and ICU availability.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/admin/hospitals">
              Manage hospitals
              <IconArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <SysAdminOverview hospitals={hospitals} />
      </div>
    </>
  );
}
