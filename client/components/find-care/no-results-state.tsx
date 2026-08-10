"use client"

/**
 * Empty-state for Page 2 when filters return zero hospitals. Suggests three
 * actionable next steps and routes to the Ambulance Directory as a last-resort
 * safety net — never block a user from emergency help because filters are
 * wrong.
 */

import Link from "next/link"
import {
  IconAmbulance,
  IconCompass,
  IconCurrencyTaka,
  IconList,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import type { FilterAction, FilterState } from "@/lib/filters"

interface Props {
  state: FilterState
  dispatch: React.Dispatch<FilterAction>
}

export function NoResultsState({ state, dispatch }: Props) {
  const bedType = state.bedTypes[0]
  const bedLabel = bedType
    ? bedType === "icu"
      ? "ICU"
      : bedType === "nicu"
        ? "NICU"
        : bedType === "ccu"
          ? "CCU"
          : "HDU"
    : "ICU"

  const location = state.district !== "all" ? state.district : state.division

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card/50 px-4 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <IconCompass className="size-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-heading text-base font-semibold text-foreground">
          No {bedLabel} beds found {location !== "all" ? `in ${location}` : ""}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Try one of these — most users find a bed within a minute.
        </p>
      </div>

      <ul className="grid w-full max-w-md gap-2">
        <Suggestion
          icon={<IconCompass className="size-3.5" />}
          label="Try nearby districts"
          onClick={() => {
            // Reset district so division-level matches show up
            dispatch({ type: "SET_DISTRICT", district: "all" })
          }}
        />
        <Suggestion
          icon={<IconCurrencyTaka className="size-3.5" />}
          label="Remove cost filter"
          onClick={() =>
            dispatch({ type: "SET_COST_RANGE", range: [0, 20_000] })
          }
        />
        <Suggestion
          icon={<IconList className="size-3.5" />}
          label="View all bed types"
          onClick={() => {
            dispatch({
              type: "TOGGLE_BED_TYPE",
              bedType: "icu",
            })
            dispatch({ type: "TOGGLE_BED_TYPE", bedType: "nicu" })
            dispatch({ type: "TOGGLE_BED_TYPE", bedType: "ccu" })
            dispatch({ type: "TOGGLE_BED_TYPE", bedType: "hdu" })
            dispatch({ type: "SET_DIVISION", division: "all" })
            dispatch({ type: "SET_DISTRICT", district: "all" })
          }}
        />
      </ul>

      <Link href="/ambulance" className="mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <IconAmbulance className="size-4" />
          Open Ambulance Directory
        </Button>
      </Link>
    </div>
  )
}

function Suggestion({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:border-niramoy-teal/40 hover:bg-niramoy-teal/5"
      >
        <span className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-niramoy-teal/10 text-niramoy-teal">
            {icon}
          </span>
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground transition-colors group-hover:text-niramoy-teal">
          Apply →
        </span>
      </button>
    </li>
  )
}
