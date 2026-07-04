"use client";

import { useDeferredValue } from "react";
import { DetailResultCard } from "@/components/find-care/detail-result-card";
import { ResultCardSkeleton } from "@/components/find-care/result-card-skeleton";
import { haversineKm } from "@/lib/hospital-utils";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  filtered: Hospital[];
  userCoords: [number, number] | null;
  hoveredId: string | null;
  selectedId: string | null;
  compareIds: string[];
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onToggleCompare: (id: string) => void;
}

const SKELETON_COUNT = 4;

/**
 * Page-2 version of the results list. Differs from the existing ResultsList
 * in that it uses `DetailResultCard` (Page 2 spec) and propagates a compare
 * toggle. The skeletons match the larger card height.
 */
export function DetailResultsList({
  filtered,
  userCoords,
  hoveredId,
  selectedId,
  compareIds,
  onHover,
  onSelect,
  onToggleCompare,
}: Props) {
  const deferred = useDeferredValue(filtered);
  const isStale = deferred !== filtered;

  if (filtered.length === 0) return null;

  return (
    <div className="space-y-3">
      {(isStale ? Array.from({ length: SKELETON_COUNT }) : deferred).map(
        (item, idx) =>
          isStale ? (
            <ResultCardSkeleton key={`s-${idx}`} />
          ) : (
            <DetailResultCard
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
              isHovered={hoveredId === (item as Hospital).id}
              isSelected={selectedId === (item as Hospital).id}
              isCompared={compareIds.includes((item as Hospital).id)}
              canCompare={
                compareIds.length < 4 ||
                compareIds.includes((item as Hospital).id)
              }
              onHover={onHover}
              onSelect={onSelect}
              onToggleCompare={onToggleCompare}
            />
          ),
      )}
    </div>
  );
}
