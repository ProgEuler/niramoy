"use client";

/**
 * Layout for all /admin/* pages. Mounts the sysadmin sidebar plus a mobile
 * sheet trigger. Wraps content in a ToastProvider so any child page can fire
 * toasts.
 */

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SysAdminSidebar } from "@/components/sysadmin/sysadmin-sidebar";
import { ToastProvider } from "@/components/ui/toast";

export default function SysAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <ToastProvider>
      <div className="flex min-h-[calc(100dvh-3.5rem)] bg-muted/20">
        <div className="hidden md:block">
          <SysAdminSidebar />
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger className="fixed bottom-4 left-4 z-40 flex size-12 items-center justify-center rounded-full bg-niramoy-teal text-white shadow-lg">
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SysAdminSidebar />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </ToastProvider>
  );
}