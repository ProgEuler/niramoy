"use client"

/**
 * Active filter pills with × to remove each one individually, plus a
 * "Clear all" link. Pill labels are derived from the current FilterState —
 * adding a new filter is one switch case away.
 */

import { IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatTaka } from "@/lib/hospital-utils"
import type { FilterAction, FilterState } from "@/lib/filters"
import type { BedType } from "@/lib/types/hospital"

interface Props {
  state: FilterState
  dispatch: React.Dispatch<FilterAction>
}

interface Pill {
  key: string
  label: string
  onRemove: () => void
}

const BED_LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
}

export function FilterPills({ state, dispatch }: Props) {
  const pills: Pill[] = []

  if (state.division !== "all") {
    pills.push({
      key: "division",
      label: state.division,
      onRemove: () => dispatch({ type: "SET_DIVISION", division: "all" }),
    })
  }
  if (state.district !== "all") {
    pills.push({
      key: "district",
      label: state.district,
      onRemove: () => dispatch({ type: "SET_DISTRICT", district: "all" }),
    })
  }
  for (const t of state.bedTypes) {
    pills.push({
      key: `bed-${t}`,
      label: `Bed: ${BED_LABEL[t]}`,
      onRemove: () => dispatch({ type: "TOGGLE_BED_TYPE", bedType: t }),
    })
  }
  if (state.costRange[0] !== 0 || state.costRange[1] !== 20_000) {
    pills.push({
      key: "cost",
      label: `${formatTaka(state.costRange[0])}–${formatTaka(state.costRange[1])}`,
      onRemove: () => dispatch({ type: "SET_COST_RANGE", range: [0, 20_000] }),
    })
  }
  if (state.minRating > 0) {
    pills.push({
      key: "rating",
      label: `${state.minRating}★ & up`,
      onRemove: () => dispatch({ type: "SET_MIN_RATING", rating: 0 }),
    })
  }
  if (state.onlyAvailable) {
    pills.push({
      key: "only-available",
      label: "Has beds",
      onRemove: () => dispatch({ type: "TOGGLE_ONLY_AVAILABLE" }),
    })
  }
  if (state.radiusKm !== null) {
    pills.push({
      key: "radius",
      label: `Within ${state.radiusKm} km`,
      onRemove: () => dispatch({ type: "SET_RADIUS", radius: null }),
    })
  }

  if (pills.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pills.map((p) => (
        <span
          key={p.key}
          className="inline-flex items-center gap-1 rounded-full border bg-card py-0.5 pr-1 pl-2.5 text-[11px] font-medium text-foreground shadow-sm"
        >
          {p.label}
          <button
            type="button"
            onClick={p.onRemove}
            aria-label={`Remove ${p.label} filter`}
            className={cn(
              "flex size-4 items-center justify-center rounded-full text-muted-foreground",
              "transition-colors hover:bg-muted hover:text-foreground"
            )}
          >
            <IconX className="size-2.5" />
          </button>
        </span>
      ))}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto p-0 text-[11px] text-muted-foreground"
        onClick={() => {
          dispatch({ type: "CLEAR_ALL" })
          dispatch({ type: "SET_GEO_STATUS", status: "idle" })
          dispatch({ type: "SET_USER_COORDS", coords: null })
        }}
      >
        Clear all
      </Button>
    </div>
  )
}
