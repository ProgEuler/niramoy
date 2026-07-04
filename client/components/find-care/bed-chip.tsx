"use client";

/**
 * A single bed-type row used in result cards and the map popup.
 * Example output: `<span><span style="color:#22c55e">ICU</span> 3/10</span>`.
 *
 * Color comes from `availabilityColor(getAvailabilityClass(h, type))`.
 * Stale rows show the count in grey via the same path; hospitals that don't
 * offer this bed type render the chip in teal (`"none"` bucket).
 */

import { getAvailabilityClass, availabilityColor } from "@/lib/hospital-utils";
import { cn } from "@/lib/utils";
import type { BedType, Hospital } from "@/lib/types/hospital";

const SHORT: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

interface Props {
  hospital: Hospital;
  type: BedType;
  /** Use a slightly bolder styling in dense contexts. */
  density?: "default" | "compact";
  className?: string;
}

export function BedChip({ hospital, type, density = "default", className }: Props) {
  const { total, available } = hospital.beds[type];
  const cls = getAvailabilityClass(hospital, type);
  const color = availabilityColor(cls);
  const compact = density === "compact";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        compact ? "text-[11px]" : "text-xs",
        className,
      )}
    >
      <span style={{ color }} className="font-medium uppercase tracking-wide">
        {SHORT[type]}
      </span>
      <span className="tabular-nums text-foreground">
        {total === 0 ? (
          <span className="text-muted-foreground">N/A</span>
        ) : (
          <>
            <span style={{ color }}>{available}</span>
            <span className="text-muted-foreground"> / {total}</span>
          </>
        )}
      </span>
    </span>
  );
}
