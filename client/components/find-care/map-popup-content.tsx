"use client";

import { Badge } from "@/components/ui/badge";
import { BedChip } from "@/components/find-care/bed-chip";
import { Button } from "@/components/ui/button";
import {
  formatRelativeTime,
  formatTaka,
} from "@/lib/hospital-utils";
import { ALL_BED_TYPES } from "@/lib/types/hospital";
import type { Hospital } from "@/lib/types/hospital";
import { IconShieldCheck, IconPhone } from "@tabler/icons-react";

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
    <div className="w-72 space-y-2 p-1 text-[12px]">
      <div className="flex items-start justify-between gap-2 pr-5">
        <div>
          <div className="font-semibold leading-tight">{hospital.name}</div>
          <div className="text-[11px] text-muted-foreground">
            {hospital.district}, {hospital.division}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-muted/40 p-2">
        {ALL_BED_TYPES.map((t) => (
          <BedChip
            key={t}
            hospital={hospital}
            type={t}
            density="compact"
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{priceLabel} / day</span>
        <span>{formatRelativeTime(hospital.last_updated)}</span>
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          asChild
        >
          <a href={`tel:${hospital.phone}`} aria-label={`Call ${hospital.name}`}>
            <IconPhone className="size-3.5" />
            Call
          </a>
        </Button>
      </div>
    </div>
  );
}
