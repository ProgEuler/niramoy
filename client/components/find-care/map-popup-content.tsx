"use client";

import { BedChip } from "@/components/find-care/bed-chip";
import { Button } from "@/components/ui/button";
import {
  formatRelativeTime,
  formatTaka,
} from "@/lib/hospital-utils";
import { ALL_BED_TYPES } from "@/lib/types/hospital";
import type { Hospital } from "@/lib/types/hospital";
import { IconMapPin, IconPhone } from "@tabler/icons-react";

interface Props {
  hospital: Hospital;
}

export function MapPopupContent({ hospital }: Props) {
  const minPrice = Math.min(...ALL_BED_TYPES.map((t) => hospital.price[t]));
  const maxPrice = Math.max(
    ...ALL_BED_TYPES.map((t) => hospital.price[t]).filter((n) => n > 0),
  );
  const priceLabel =
    minPrice === 0 && maxPrice === 0
      ? "Free (public)"
      : `${formatTaka(minPrice)}${minPrice !== maxPrice ? ` – ${formatTaka(maxPrice)}` : ""}`;

  return (
    <div className="w-full space-y-3 p-1 text-sm">
      {/* Header — name + location, with breathing room for close button */}
      <div className="flex items-start justify-between gap-3 pr-6">
        <div className="min-w-0">
          <div className="text-base font-semibold leading-snug text-foreground">
            {hospital.name}
          </div>
          <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
            <IconMapPin className="mt-0.5 size-3.5 shrink-0" />
            <span className="line-clamp-2">
              {hospital.district}, {hospital.division}
            </span>
          </div>
        </div>
      </div>

      {/* Bed availability grid — bigger chips, more breathing room */}
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-2.5">
        {ALL_BED_TYPES.map((t) => (
          <BedChip key={t} hospital={hospital} type={t} density="compact" />
        ))}
      </div>

      {/* Footer — price (prominent) + freshness */}
      <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
        <span className="font-semibold text-foreground tabular-nums">
          {priceLabel}
          <span className="ml-1 font-normal text-muted-foreground">/ day</span>
        </span>
        <span className="text-muted-foreground">
          {formatRelativeTime(hospital.last_updated)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5 bg-destructive px-3 text-sm text-white hover:bg-destructive/90"
          asChild
        >
          <a href={`tel:${hospital.phone}`} aria-label={`Call ${hospital.name}`}>
            <IconPhone className="size-4" />
            Call
          </a>
        </Button>
      </div>
    </div>
  );
}