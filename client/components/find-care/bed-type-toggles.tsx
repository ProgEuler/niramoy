"use client"

/**
 * Multi-select toggle row for the four bed types. Empty selection = show all.
 *
 * Active state uses the brand teal (`bg-niramoy-teal`) per the product spec
 * — not the theme primary, which is the same hue family but slightly
 * different. Explicit class keeps the brand consistent across themes.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BedType } from "@/lib/types/hospital"
import { ALL_BED_TYPES } from "@/lib/types/hospital"
import type { FilterAction } from "@/lib/filters"

const LABELS: Record<BedType, { full: string; short: string }> = {
  icu: { full: "ICU — Intensive Care Unit", short: "ICU" },
  nicu: { full: "NICU — Neonatal ICU", short: "NICU" },
  ccu: { full: "CCU — Coronary Care Unit", short: "CCU" },
  hdu: { full: "HDU — High Dependency Unit", short: "HDU" },
}

interface Props {
  selected: BedType[]
  dispatch: React.Dispatch<FilterAction>
}

export function BedTypeToggles({ selected, dispatch }: Props) {
  return (
    <div
      role="group"
      aria-label="Bed type filter"
      className="flex flex-wrap gap-1.5"
    >
      {ALL_BED_TYPES.map((type) => {
        const active = selected.includes(type)
        return (
          <Tooltip key={type}>
            <TooltipTrigger asChild data-slot="tooltip-trigger">
              <Button
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                aria-pressed={active}
                className={cn(
                  "h-7 px-2.5 text-xs",
                  active &&
                    "bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
                )}
                onClick={() =>
                  dispatch({ type: "TOGGLE_BED_TYPE", bedType: type })
                }
              >
                {LABELS[type].short}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{LABELS[type].full}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
