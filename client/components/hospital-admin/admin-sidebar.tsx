"use client";

/**
 * Hospital Admin sidebar — used by every page in the admin portal.
 * Shows the hospital name + logo, six nav links (Dashboard, Bed Counts,
 * Pricing, Profile, History, Logout).
 *
 * Server-rendered navigation aside; collapses to a Sheet on mobile via the
 * existing `use-mobile.ts` hook. Stays out of the visual scope of Page 9
 * to keep the dashboard focus on KPIs.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconActivity,
  IconBuildingHospital,
  IconCamera,
  IconClipboardList,
  IconCoin,
  IconDashboard,
  IconLogout,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  hospital: Hospital;
}

const ITEMS = [
  { href: "/admin/hospital", label: "Dashboard", icon: IconDashboard },
  {
    href: "/admin/hospital/bed-counts",
    label: "Update Bed Counts",
    icon: IconActivity,
  },
  { href: "/admin/hospital/pricing", label: "Update Pricing", icon: IconCoin },
  {
    href: "/admin/hospital/profile",
    label: "Update Profile",
    icon: IconCamera,
  },
  {
    href: "/admin/hospital/history",
    label: "Update History",
    icon: IconClipboardList,
  },
] as const;

export function AdminSidebar({ hospital }: Props) {
  const path = usePathname();
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-card">
      <Link
        href="/admin/hospital"
        className="flex items-center gap-2 border-b px-4 py-4"
      >
        <span className="flex size-9 items-center justify-center rounded-md bg-niramoy-teal text-white">
          <IconBuildingHospital className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-foreground">
            {hospital.name}
          </div>
          <div className="truncate text-[10px] text-muted-foreground">
            {hospital.district}, {hospital.division}
          </div>
        </div>
      </Link>

      <nav className="flex-1 space-y-0.5 px-2 py-3" aria-label="Admin">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = path === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <IconLogout className="size-3.5" />
          Logout
        </Link>
      </div>
    </aside>
  );
}
