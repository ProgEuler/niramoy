"use client";

/**
 * System Admin sidebar — landing on /admin. Mirrors the hospital admin
 * sidebar's visual language (icon nav, logout at the bottom).
 *
 * Routes (planned):
 *   - Overview        → /admin
 *   - Manage Hospitals → /admin/hospitals
 *
 * Add more as future pages land.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconLogout,
  IconShieldCog,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: IconLayoutDashboard },
  {
    href: "/admin/hospitals",
    label: "Manage Hospitals",
    icon: IconShieldCog,
  },
];

export function SysAdminSidebar() {
  const path = usePathname();
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-card">
      <Link
        href="/admin"
        className="flex items-center gap-2 border-b px-4 py-4"
      >
        <span className="flex size-9 items-center justify-center rounded-md bg-niramoy-teal text-white">
          <IconShieldCog className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-foreground">
            System Admin
          </div>
          <div className="truncate text-[10px] text-muted-foreground">
            Niramoy platform
          </div>
        </div>
      </Link>

      <nav className="flex-1 space-y-0.5 px-2 py-3" aria-label="System admin">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/admin"
              ? path === item.href
              : path.startsWith(item.href);
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