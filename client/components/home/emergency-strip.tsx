"use client";

import { IconAmbulance, IconPhone } from "@tabler/icons-react";

/**
 * Pinned red emergency strip. Two tappable numbers, no icons inside the link
 * to keep the touch target large on mobile.
 */
export function EmergencyStrip() {
  return (
    <div
      role="region"
      aria-label="Emergency hotlines"
      className="w-full bg-destructive text-white"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <span className="flex items-center gap-2 text-xs font-medium">
          <IconAmbulance className="size-4" />
          24/7 emergency ambulance hotline
        </span>
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <a
            href="tel:999"
            className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1 transition-colors hover:bg-white/20"
            aria-label="Call national emergency 999"
          >
            <IconPhone className="size-3.5" />
            999
          </a>
          <span aria-hidden className="text-white/60">·</span>
          <a
            href="tel:16401"
            className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1 transition-colors hover:bg-white/20"
            aria-label="Call DGHS hotline 16401"
          >
            <IconPhone className="size-3.5" />
            DGHS 16401
          </a>
        </div>
      </div>
    </div>
  );
}
