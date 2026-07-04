"use client";

import { useDeferredValue } from "react";
import { ResultCard } from "@/components/find-care/result-card";
import { ResultCardSkeleton } from "@/components/find-care/result-card-skeleton";
import { haversineKm } from "@/lib/hospital-utils";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  filtered: Hospital[];
  userCoords: [number, number] | null;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const SKELETON_COUNT = 5;

export function ResultsList({
  filtered,
  userCoords,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}: Props) {
  // `useDeferredValue` lets React keep the map responsive while the result
  // list catches up — per AGENTS.md low-end Android + 4G requirement.
  const deferred = useDeferredValue(filtered);
  const isStale = deferred !== filtered;

  if (filtered.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
        No hospitals match these filters. Try widening the cost range or
        clearing some filters.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {(isStale ? Array.from({ length: SKELETON_COUNT }) : deferred).map(
        (item, idx) =>
          isStale ? (
            <ResultCardSkeleton key={`s-${idx}`} />
          ) : (
            <ResultCard
              key={(item as Hospital).id}
              hospital={item as Hospital}
              distanceKm={
                userCoords
                  ? haversineKm(userCoords, [
                      (item as Hospital).lng,
                      (item as Hospital).lat,
                    ])
                  : undefined
              }
              isActive={hoveredId === (item as Hospital).id}
              isSelected={selectedId === (item as Hospital).id}
              onHover={onHover}
              onSelect={onSelect}
            />
          ),
      )}
    </div>
  );
}