"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BedChip } from "@/components/find-care/bed-chip";
import {
  formatRelativeTime,
  formatTaka,
} from "@/lib/hospital-utils";
import { cn } from "@/lib/utils";
import {
  IconShieldCheck,
  IconPhone,
  IconArrowUpRight,
} from "@tabler/icons-react";
import { ALL_BED_TYPES } from "@/lib/types/hospital";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  hospital: Hospital;
  distanceKm?: number;
  isActive: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export function ResultCard({
  hospital,
  distanceKm,
  isActive,
  isSelected,
  onHover,
  onSelect,
}: Props) {
  const minPrice = Math.min(...ALL_BED_TYPES.map((t) => hospital.price[t]));
  const maxPrice = Math.max(
    ...ALL_BED_TYPES.map((t) => hospital.price[t]).filter((n) => n > 0),
  );
  const priceLabel =
    minPrice === 0 && maxPrice === 0
      ? "Free (public)"
      : `${formatTaka(minPrice)}${minPrice !== maxPrice ? ` – ${formatTaka(maxPrice)}` : ""}`;

  return (
    <Card
      data-hospital-id={hospital.id}
      data-active={isActive}
      className={cn(
        "transition-all duration-150",
        "hover:scale-[1.01] hover:shadow-md",
        "data-[active=true]:ring-2 data-[active=true]:ring-niramoy-teal data-[active=true]:shadow-lg",
        isSelected && "ring-2 ring-niramoy-teal",
      )}
      onMouseEnter={() => onHover(hospital.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(hospital.id)}
    >
      <CardContent className="space-y-1.5 p-3">
        {/* Header: name + verified */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold">{hospital.name}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {hospital.district}
              {distanceKm !== undefined && (
                <> · {distanceKm.toFixed(1)} km</>
              )}
            </div>
          </div>
          {hospital.verified && (
            <Badge className="shrink-0 gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90">
              <IconShieldCheck className="size-3" />
              Verified
            </Badge>
          )}
        </div>

        {/* Bed chips */}
        <div className="flex flex-wrap gap-x-2.5 gap-y-1">
          {ALL_BED_TYPES.map((t) => (
            <BedChip key={t} hospital={hospital} type={t} />
          ))}
        </div>

        {/* Price + timestamp */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="tabular-nums">{priceLabel} / day</span>
          <span>{formatRelativeTime(hospital.last_updated)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1.5 pt-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(hospital.id);
            }}
          >
            <IconArrowUpRight className="size-3.5" />
            View Details
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            asChild
          >
            <a
              href={`tel:${hospital.phone}`}
              aria-label={`Call ${hospital.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <IconPhone className="size-3.5" />
              Call
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}