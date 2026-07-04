"use client";

/**
 * Layout for all /admin/hospital/* pages. Mounts the admin sidebar plus a
 * mobile sheet trigger. The main column receives each page's content.
 *
 * Pick the first verified hospital as the admin's "current" hospital. In
 * production this would come from the auth context.
 */

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AdminSidebar } from "@/components/hospital-admin/admin-sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { useHospitalStore } from "@/lib/use-hospital-store";

export default function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { hospitals } = useHospitalStore();
  const [hospital] = useState(() => hospitals.find((h) => h.verified) ?? hospitals[0]);

  // On the very first render the store might be empty until hydration runs
  // (the seed JSON is hydrated by useState initializer, but in a hot-reload
  // scenario it could differ). We don't re-pick once chosen.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (!hospital) return <div className="p-6 text-sm text-muted-foreground">No hospital linked to this account yet.</div>;

  return (
    <ToastProvider>
      <div className="flex min-h-[calc(100dvh-3.5rem)] bg-muted/20">
        <div className="hidden md:block">
          <AdminSidebar hospital={hospital} />
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger className="fixed bottom-4 left-4 z-40 flex size-12 items-center justify-center rounded-full bg-niramoy-teal text-white shadow-lg">
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <AdminSidebar hospital={hospital} />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </ToastProvider>
  );
}
