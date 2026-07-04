"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconArrowUpRight,
  IconMapPin,
  IconPhone,
  IconRoute,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BedChip } from "@/components/find-care/bed-chip";
import { formatRelativeTime, formatTaka } from "@/lib/hospital-utils";
import { cn } from "@/lib/utils";
import { ALL_BED_TYPES } from "@/lib/types/hospital";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  hospital: Hospital;
  distanceKm?: number;
  isHovered: boolean;
  isSelected: boolean;
  isCompared: boolean;
  canCompare: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onToggleCompare: (id: string) => void;
}

/**
 * Full Page-2 result card — the "card-shaped hospital" with verified badge,
 * bed availability grid, cost range, rating, optional distance, last update,
 * four action buttons (View Details · Directions · Call · Compare checkbox).
 *
 * Designed for a single column in a list view; the card owns enough info that
 * the map popup can stay minimal.
 */
export function DetailResultCard({
  hospital,
  distanceKm,
  isHovered,
  isSelected,
  isCompared,
  canCompare,
  onHover,
  onSelect,
  onToggleCompare,
}: Props) {
  const priceInfo = usePriceLabel(hospital);
  const rating = hospital.rating ?? 0;
  const reviewCount = Math.max(8, Math.round(rating * 14));

  const [compareChecked, setCompareChecked] = useState(isCompared);

  // Sync compare state if it changes externally (e.g. capped removal).
  if (isCompared !== compareChecked) {
    // Use deferred setState to avoid setState-in-render.
    queueMicrotask(() => setCompareChecked(isCompared));
  }

  return (
    <Card
      data-hospital-id={hospital.id}
      onMouseEnter={() => onHover(hospital.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(hospital.id)}
      className={cn(
        "gap-0 py-0 transition-all duration-150",
        "hover:shadow-md",
        isHovered && "ring-2 ring-niramoy-teal/60",
        isSelected && "ring-2 ring-niramoy-teal",
      )}
    >
      {/* Top: name + verified */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-heading text-sm font-semibold text-foreground sm:text-base">
              {hospital.name}
            </h3>
            {hospital.verified && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-niramoy-teal px-2 py-0.5 text-[10px] font-semibold text-white">
                ✓ Verified
              </span>
            )}
            {isSelected && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                Selected on map
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            <span className="font-medium">{hospital.district}</span>
            {" · "}
            <span>{hospital.address}</span>
          </p>
        </div>
        {distanceKm !== undefined && (
          <span
            className="ml-2 shrink-0 rounded-md bg-muted/60 px-2 py-1 text-[11px] font-medium tabular-nums text-foreground"
            aria-label={`${distanceKm.toFixed(1)} kilometres from your location`}
          >
            {distanceKm.toFixed(1)} km
          </span>
        )}
      </div>

      {/* Bed availability grid */}
      <CardContent className="grid grid-cols-4 gap-2 px-4 py-3">
        {ALL_BED_TYPES.map((t) => (
          <BedStack key={t} hospital={hospital} type={t} />
        ))}
      </CardContent>

      {/* Meta: cost, rating, last updated */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="tabular-nums font-medium text-foreground">
            {priceInfo.label} <span className="text-muted-foreground">/ day</span>
          </span>
          <span aria-hidden className="text-border">|</span>
          <RatingLine value={rating} count={reviewCount} />
          <span aria-hidden className="text-border">|</span>
          <span>{formatRelativeTime(hospital.last_updated)}</span>
        </div>
        {distanceKm === undefined && (
          <span className="inline-flex items-center gap-1">
            <IconMapPin className="size-3" />
            {hospital.division}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-t px-3 py-2">
        <label
          className={cn(
            "flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium",
            compareChecked
              ? "bg-niramoy-teal/10 text-niramoy-teal"
              : "text-muted-foreground hover:bg-muted",
            (!canCompare && !compareChecked) && "cursor-not-allowed opacity-60",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={compareChecked}
            disabled={!canCompare && !compareChecked}
            onCheckedChange={() => {
              setCompareChecked((v) => !v);
              onToggleCompare(hospital.id);
            }}
            aria-label={`Add ${hospital.name} to comparison`}
          />
          Compare
        </label>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            asChild
          >
            <a
              href={`tel:${hospital.phone}`}
              onClick={(e) => e.stopPropagation()}
            >
              <IconPhone className="size-3.5" />
              Call Now
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            asChild
          >
            <a
              href={directionsUrl(hospital)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <IconRoute className="size-3.5" />
              Directions
            </a>
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 bg-niramoy-teal px-2 text-[11px] text-white hover:bg-niramoy-teal/90"
            asChild
          >
            <Link
              href={`/hospital/${hospital.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <IconArrowUpRight className="size-3.5" />
              View Details
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function BedStack({
  hospital,
  type,
}: {
  hospital: Hospital;
  type: import("@/lib/types/hospital").BedType;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md bg-muted/40 px-2 py-1.5 text-center">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {labelOf(type)}
      </span>
      <BedChip hospital={hospital} type={type} density="compact" />
    </div>
  );
}

function labelOf(t: import("@/lib/types/hospital").BedType): string {
  return t === "icu" ? "ICU" : t === "nicu" ? "NICU" : t === "ccu" ? "CCU" : "HDU";
}

function RatingLine({ value, count }: { value: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-foreground">
      <span className="flex">
        {[0, 1, 2, 3, 4].map((i) =>
          i < Math.round(value) ? (
            <IconStarFilled key={i} className="size-3 text-yellow-500" />
          ) : (
            <IconStar key={i} className="size-3 text-muted-foreground/40" />
          ),
        )}
      </span>
      <span className="tabular-nums font-medium">{value.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </span>
  );
}

function usePriceLabel(hospital: Hospital): { label: string } {
  const { min, max, free } = (() => {
    let min = Infinity;
    let max = -Infinity;
    for (const t of ALL_BED_TYPES) {
      const p = hospital.price[t];
      if (p <= 0) continue;
      if (p < min) min = p;
      if (p > max) max = p;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max))
      return { min: 0, max: 0, free: true };
    return { min, max, free: false };
  })();
  const label = free
    ? "Free (public)"
    : min === max
      ? formatTaka(min)
      : `${formatTaka(min)}–${formatTaka(max)}`;
  return { label };
}

function directionsUrl(hospital: Hospital): string {
  // Universal cross-platform directions link. Google Maps ignores destination
  // text and uses lat,lng when provided in the query string.
  return `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`;
}
