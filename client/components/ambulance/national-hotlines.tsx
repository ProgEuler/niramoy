"use client";

/**
 * Always-pinned national hotlines. Rendered above the directory list
 * regardless of the district filter — per spec, these are the canonical
 * emergency numbers everyone in Bangladesh should know.
 */

import { IconAmbulance, IconPhone } from "@tabler/icons-react";

const HOTLINES: { label: string; phone: string; description: string }[] = [
  {
    label: "National Emergency",
    phone: "999",
    description: "Police · Fire · Ambulance",
  },
  {
    label: "DGHS Health Hotline",
    phone: "16401",
    description: "Medical advice & hospital info",
  },
];

export function NationalHotlines() {
  return (
    <section
      aria-label="National emergency hotlines"
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 sm:p-4"
    >
      <div className="mb-2 flex items-center gap-2 text-destructive">
        <IconAmbulance className="size-4" />
        <h2 className="font-heading text-sm font-semibold">
          Need an ambulance? Call these numbers immediately
        </h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {HOTLINES.map((h) => (
          <a
            key={h.phone}
            href={`tel:${h.phone}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-card p-3 transition-colors hover:bg-destructive/10"
            aria-label={`Call ${h.label} at ${h.phone}`}
          >
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {h.label}
              </div>
              <div className="font-heading text-2xl font-semibold tabular-nums text-destructive">
                {h.phone}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {h.description}
              </div>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive text-white shadow-sm">
              <IconPhone className="size-5" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
