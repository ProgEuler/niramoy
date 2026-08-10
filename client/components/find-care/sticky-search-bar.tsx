"use client"

/**
 * Sticky search bar for Page 2. A condensed, always-visible band at the top
 * of the search-results page containing every primary filter (Division,
 * District, Bed Type, Cost, Rating) plus a "Search" submit. The bar is
 * intentionally compact — secondary controls live below as filter pills.
 */

import { useState } from "react"
import { IconChevronDown, IconFilter } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { DivisionSelect } from "@/components/find-care/division-select"
import { DistrictSelect } from "@/components/find-care/district-select"
import { BedTypeToggles } from "@/components/find-care/bed-type-toggles"
import { CostRangeSlider } from "@/components/find-care/cost-range-slider"
import { RatingSelect } from "@/components/find-care/rating-select"
import { RadiusPills } from "@/components/find-care/radius-pills"
import { FindNearestButton } from "@/components/find-care/find-nearest-button"
import { GeoErrorBanner } from "@/components/find-care/geo-error-banner"
import type { FilterAction, FilterState } from "@/lib/filters"

interface Props {
  state: FilterState
  dispatch: React.Dispatch<FilterAction>
}

export function StickySearchBar({ state, dispatch }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <Card
      size="sm"
      className="sticky top-14 z-30 rounded-none border-x-0 border-t-0 shadow-sm"
    >
      <CardContent className="space-y-2 py-2.5">
        <div className="grid gap-2 lg:grid-cols-[1fr_1fr_1.6fr_auto] lg:items-end">
          <Field label="Division">
            <DivisionSelect value={state.division} dispatch={dispatch} />
          </Field>
          <Field label="District">
            <DistrictSelect
              division={state.division}
              value={state.district}
              dispatch={dispatch}
            />
          </Field>
          <Field label="Bed type">
            <BedTypeToggles selected={state.bedTypes} dispatch={dispatch} />
          </Field>
          <div className="flex items-end gap-1.5">
            <Collapsible
              open={advancedOpen}
              onOpenChange={setAdvancedOpen}
              className="contents"
            >
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="h-7 gap-1 px-2 text-xs"
                  aria-expanded={advancedOpen}
                >
                  <IconFilter className="size-3.5" />
                  More
                  <IconChevronDown
                    className={`size-3.5 transition-transform ${
                      advancedOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
            <Button
              type="button"
              size="default"
              className="h-7 bg-niramoy-teal px-3 text-xs text-white hover:bg-niramoy-teal/90"
              onClick={() => {
                /* filters already reactive; this just re-asserts focus */
                if (typeof document !== "undefined") {
                  document
                    .getElementById("results-anchor")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              }}
            >
              Search
            </Button>
          </div>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleContent className="space-y-3 pt-1">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Cost per day">
                <CostRangeSlider value={state.costRange} dispatch={dispatch} />
              </Field>
              <Field label="Minimum rating">
                <RatingSelect value={state.minRating} dispatch={dispatch} />
              </Field>
              <Field label="Search radius">
                <RadiusPills
                  value={state.radiusKm}
                  geoStatus={state.geoStatus}
                  dispatch={dispatch}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FindNearestButton
                geoStatus={state.geoStatus}
                dispatch={dispatch}
              />
              <GeoErrorBanner geoStatus={state.geoStatus} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </div>
      <div className="w-full">{children}</div>
    </div>
  )
}
