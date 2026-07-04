"use client";

/**
 * Page-5 results sidebar. Collapsible list of hospitals alongside the map;
 * sorted by distance from the user when geolocation is granted, otherwise
 * by ICU availability. Clicking a row pans/zooms the map to that hospital.
 */

import { useMemo } from "react";
import { IconList, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BedChip } from "@/components/find-care/bed-chip";
import {
  formatRelativeTime,
  haversineKm,
} from "@/lib/hospital-utils";
import { cn } from "@/lib/utils";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  hospitals: Hospital[];
  userCoords: [number, number] | null;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function MapResultsSidebar({
  hospitals,
  userCoords,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  onClose,
}: Props) {
  const sorted = useMemo(() => {
    return hospitals
      .slice()
      .sort((a, b) => {
        if (userCoords) {
          return (
            haversineKm(userCoords, [a.lng, a.lat]) -
            haversineKm(userCoords, [b.lng, b.lat])
          );
        }
        return b.beds.icu.available - a.beds.icu.available;
      });
  }, [hospitals, userCoords]);

  return (
    <aside
      className="flex h-full w-[340px] shrink-0 flex-col border-l bg-background"
      aria-label="Hospital results list"
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <IconList className="size-3.5" />
          {sorted.length} {sorted.length === 1 ? "hospital" : "hospitals"}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label="Hide list"
        >
          <IconX className="size-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sorted.length === 0 ? (
          <Card size="sm">
            <CardContent className="p-4 text-center text-xs text-muted-foreground">
              No hospitals match these filters.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((h) => {
              const distKm = userCoords
                ? haversineKm(userCoords, [h.lng, h.lat])
                : undefined;
              const isActive = selectedId === h.id;
              const isHovered = hoveredId === h.id;
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(h.id)}
                    onMouseEnter={() => onHover(h.id)}
                    onMouseLeave={() => onHover(null)}
                    className={cn(
                      "w-full rounded-md border bg-card p-2 text-left transition-colors",
                      "hover:border-niramoy-teal/40 hover:bg-niramoy-teal/5",
                      isHovered && "border-niramoy-teal/60 bg-niramoy-teal/5",
                      isActive && "border-niramoy-teal ring-2 ring-niramoy-teal/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-foreground">
                          {h.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {h.district}
                        </div>
                      </div>
                      {distKm !== undefined && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground">
                          {distKm.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                      {(["icu", "nicu", "ccu", "hdu"] as const).map((t) => (
                        <BedChip
                          key={t}
                          hospital={h}
                          type={t}
                          density="compact"
                        />
                      ))}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      Updated {formatRelativeTime(h.last_updated)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
