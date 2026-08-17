"use client"

/**
 * /find-care — public search results page.
 *
 * Marketplace-style: a filter rail on the left and a grid of hospital
 * detail cards on the right. The home page `QuickSearch` and the home
 * "See all hospitals" CTA both land here, encoding the user's picks as
 * query params:
 *
 *   /find-care?division=Dhaka&district=Dhaka&beds=icu,nicu
 *
 * On mount we hydrate the filter reducer from those params so the filter
 * rail, header pills, and result cards all show the selection from the
 * home page.
 *
 * Data source: `useHospitalSearch` calls GET /api/public/search via
 * TanStack Query. The page translates the UI filter state into API
 * params (single `bed_type` + `district` + `sort_by`), runs the result
 * through the existing client-side `applyFilters` for division / multi-bed
 * / cost / rating refinement, then renders.
 *
 * Why client-side refinement? The backend exposes a single `bed_type`
 * filter and doesn't accept a division. Combining server-side search
 * with the same client-side reducer the rest of the app uses means the
 * UI stays consistent and Snappy: filters update instantly without a
 * round-trip when the user toggles ICU/CCU or adjusts cost.
 *
 * Why not the map? The product brief for the home-page search is
 * "find a hospital, see details, make a call" — a scrollable card list
 * is faster to scan during an emergency than a map. The dedicated /map
 * page still exists for users who want geospatial exploration.
 */

import { Suspense, useEffect, useMemo, useReducer, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  IconAlertTriangle,
  IconRefresh,
} from "@tabler/icons-react"
import { SiteNavbar } from "@/components/home/site-navbar"
import { SiteFooter } from "@/components/home/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BedTypeToggles } from "@/components/find-care/bed-type-toggles"
import { DivisionSelect } from "@/components/find-care/division-select"
import { DistrictSelect } from "@/components/find-care/district-select"
import { CostRangeSlider } from "@/components/find-care/cost-range-slider"
import { RatingSelect } from "@/components/find-care/rating-select"
import { AvailabilityToggle } from "@/components/find-care/availability-toggle"
import { ClearFiltersButton } from "@/components/find-care/clear-filters-button"
import { LiveStatsBar } from "@/components/find-care/live-stats-bar"
import { Disclaimer } from "@/components/find-care/disclaimer"
import { FilterPills } from "@/components/find-care/filter-pills"
import { ResultCountLabel } from "@/components/find-care/result-count-label"
import { SortBar } from "@/components/find-care/sort-bar"
import { NoResultsState } from "@/components/find-care/no-results-state"
import { HospitalDetailCard } from "@/components/find-care/hospital-detail-card"
import {
  applyFilters,
  filterReducer,
  INITIAL_FILTER_STATE,
  type FilterAction,
  type FilterState,
} from "@/lib/filters"
import {
  ALL_BED_TYPES,
  ALL_DIVISIONS,
  type HospitalStats,
} from "@/lib/types/hospital"
import {
  useHospitalSearch,
  sortToBackendSort,
} from "@/lib/hooks/use-hospital-search"
import type { HospitalSearchParams } from "@/lib/api/hospitals"
import { computeStats } from "@/lib/hospital-utils"
import type { Hospital } from "@/lib/types/hospital"
import { ApiError } from "@/lib/api/client"

export default function FindCarePage() {
  // `useSearchParams` reads URL params; in Next 16 it requires a Suspense
  // boundary so the page can be statically rendered / streamed safely.
  return (
    <Suspense fallback={<FindCareFallback />}>
      <FindCareInner />
    </Suspense>
  )
}

function FindCareFallback() {
  return (
    <>
      <SiteNavbar />
      <main className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
        Loading search…
      </main>
      <SiteFooter />
    </>
  )
}

function FindCareInner() {
  const params = useSearchParams()

  // Initialize the reducer with the URL params layered on top of the
  // canonical initial state. The lazy form of `useReducer` runs this once.
  const [state, dispatch] = useReducer(
    filterReducer,
    undefined,
    () => buildInitialState(params)
  )

  // ── Server-side query ────────────────────────────────────────────────
  // Translate the UI filter state into a backend `HospitalSearchParams`.
  // The backend only accepts ONE bed type, so when the user has multiple
  // selected we send the first and let `applyFilters` (client-side) do
  // the rest of the matching against the larger result set.
  const [retryIndex, setRetryIndex] = useState(0)
  const apiParams = useMemo<HospitalSearchParams>(
    () => buildApiParams(state),
    [state]
  )

  const { hospitals, isLoading, isError, error, isFetching, refetch } =
    useHospitalSearch({ params: apiParams })

  // Retry once on transient failure — the public router occasionally
  // returns 500 when the DB connection is being recycled. We don't loop;
  // a stuck query stays stuck so the user can hit "Try again" manually.
  useEffect(() => {
    if (isError && retryIndex === 0) {
      const t = setTimeout(() => setRetryIndex(1), 1500)
      return () => clearTimeout(t)
    }
    return undefined
  }, [isError, retryIndex])

  // ── Client-side refinement ───────────────────────────────────────────
  // The backend handles single-bed-type + district + sort + cost + rating
  // matches, but the UI also needs division filtering and multi-bed
  // selection. Run the page's existing reducer over the API result.
  const filtered = useMemo(
    () => applyFilters(hospitals, state),
    [hospitals, state]
  )

  // ── Stats for the live-stats-bar ─────────────────────────────────────
  // Derived from the full unfiltered API response so the numbers don't
  // jump around as filters change. (The dedicated /stats endpoint is
  // currently unstable on the backend, hence local derivation.)
  const stats = useMemo<HospitalStats>(
    () => computeStats(hospitals) ?? defaultStats(),
    [hospitals]
  )
  const totalHospitals = hospitals.length

  return (
    <>
      <SiteNavbar />
      <main className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-muted/10">
        <PageHeader totalHospitals={totalHospitals} isFetching={isFetching} />

        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Filter rail (sticky on lg+) */}
            <FilterRail state={state} dispatch={dispatch} stats={stats} />

            {/* Results column */}
            <section className="min-w-0 space-y-4">
              {/* Result count + sort row */}
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <ResultCountLabel
                    count={filtered.length}
                    state={state}
                    totalHospitals={totalHospitals}
                  />
                  <FilterPills state={state} dispatch={dispatch} />
                </div>
                <SortBar value={state.sort} dispatch={dispatch} />
              </div>

              {/* Error / Loading / Cards / Empty */}
              {isError && !isLoading ? (
                <ErrorState
                  error={error}
                  onRetry={() => {
                    setRetryIndex((n) => n + 1)
                    refetch()
                  }}
                />
              ) : isLoading && hospitals.length === 0 ? (
                <LoadingState />
              ) : filtered.length === 0 ? (
                <NoResultsState state={state} dispatch={dispatch} />
              ) : (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filtered.map((h: Hospital) => (
                    <li key={h.id}>
                      <HospitalDetailCard
                        hospital={h}
                        userCoords={state.userCoords}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <Disclaimer />
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

// ─── sub-components ───────────────────────────────────────────────────────

function PageHeader({
  totalHospitals,
  isFetching,
}: {
  totalHospitals: number
  isFetching: boolean
}) {
  return (
    <section className="border-b bg-gradient-to-b from-niramoy-teal/5 via-background to-background">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-3 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-niramoy-teal">
            Search results
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Find the right hospital for your patient
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Browse {totalHospitals.toLocaleString()} verified hospitals across
            Bangladesh. Filter by location, bed type, cost, and rating — every
            card shows live availability, the latest update time, and a
            tap-to-call button.
          </p>
        </div>
        {isFetching && totalHospitals > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-foreground/10">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-niramoy-teal opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-niramoy-teal" />
            </span>
            Refreshing…
          </span>
        )}
      </div>
    </section>
  )
}

interface RailProps {
  state: FilterState
  dispatch: React.Dispatch<FilterAction>
  stats: HospitalStats
}

function FilterRail({ state, dispatch, stats }: RailProps) {
  return (
    <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
      <div className="space-y-3">
        <LiveStatsBar stats={stats} />

        <Card size="sm">
          <CardContent className="space-y-4">
            <RailSection label="Location">
              <div className="grid gap-2">
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
              </div>
            </RailSection>

            <Separator />

            <RailSection label="Bed type">
              <BedTypeToggles selected={state.bedTypes} dispatch={dispatch} />
            </RailSection>

            <Separator />

            <RailSection label="Availability">
              <AvailabilityToggle
                value={state.onlyAvailable}
                dispatch={dispatch}
              />
            </RailSection>

            <Separator />

            <RailSection label="Cost per day (BDT)">
              <CostRangeSlider value={state.costRange} dispatch={dispatch} />
            </RailSection>

            <Separator />

            <RailSection label="Minimum rating">
              <RatingSelect value={state.minRating} dispatch={dispatch} />
            </RailSection>

            <Separator />

            <div className="flex items-center justify-between">
              <ClearFiltersButton dispatch={dispatch} />
              <span className="text-[10px] text-muted-foreground">
                All filters apply live
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  )
}

function RailSection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </div>
      {children}
    </div>
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
    <div className="space-y-1">
      <div className="text-[10px] font-medium text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="h-20 w-full animate-pulse bg-muted" />
          <CardContent className="space-y-3 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="h-12 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ErrorState({
  error,
  onRetry,
}: {
  error: Error | null
  onRetry: () => void
}) {
  const message =
    error instanceof ApiError
      ? error.detail || `Server returned ${error.status}`
      : error?.message || "Could not reach the hospital service."

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <IconAlertTriangle className="size-5" />
        </span>
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">
            We couldn&apos;t load hospitals
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{message}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="gap-1.5"
        >
          <IconRefresh className="size-3.5" />
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────

function defaultStats(): HospitalStats {
  return {
    totalHospitals: 0,
    icuAvailable: 0,
    nicuAvailable: 0,
    lastUpdatedMax: new Date().toISOString(),
  }
}

/**
 * Build a filter state from the home-page `QuickSearch` URL:
 *   ?division=<BangladeshDivision|all>
 *   &district=<string|all>
 *   &beds=icu,nicu,ccu,hdu           (comma-separated; subset of ALL_BED_TYPES)
 *
 * Unknown values fall back to the canonical initial defaults so a stale
 * or hand-edited URL never crashes the page.
 */
function buildInitialState(
  params: ReturnType<typeof useSearchParams>
): typeof INITIAL_FILTER_STATE {
  const divisionParam = params.get("division") ?? "all"
  const districtParam = params.get("district") ?? "all"
  const bedsParam = params.get("beds")

  const division = (ALL_DIVISIONS as readonly string[]).includes(divisionParam)
    ? (divisionParam as (typeof INITIAL_FILTER_STATE)["division"])
    : "all"

  const district: string =
    typeof districtParam === "string" && districtParam.length > 0
      ? districtParam
      : "all"

  const beds = bedsParam
    ? (bedsParam
        .split(",")
        .map((b) => b.trim().toLowerCase())
        .filter((b): b is (typeof ALL_BED_TYPES)[number] =>
          (ALL_BED_TYPES as readonly string[]).includes(b)
        ) as (typeof INITIAL_FILTER_STATE)["bedTypes"])
    : INITIAL_FILTER_STATE.bedTypes.slice()

  return {
    ...INITIAL_FILTER_STATE,
    division,
    district,
    bedTypes: beds,
  }
}

/**
 * Translate UI `FilterState` into `HospitalSearchParams`.
 *
 * The backend only accepts:
 *   - one `bed_type`
 *   - one `district`
 *   - numeric cost / rating bounds
 *   - `sort_by`
 *
 * Multi-bed selection, division filtering, `onlyAvailable`, and the radius
 * filter are NOT sent to the server — they are applied locally by
 * `applyFilters` on the page so the UI stays consistent with the rest of
 * the app.
 */
function buildApiParams(state: FilterState): HospitalSearchParams {
  const params: HospitalSearchParams = {
    sort_by: sortToBackendSort(state.sort),
    page: 1,
    // Pull a healthy first page so we have enough room for the local
    // multi-bed / division refinement.
    page_size: 100,
  }

  // Bed type — only send a SINGLE `bed_type` hint to the backend when the
  // user has narrowed to exactly one type. With multiple types selected we
  // let the backend return all hospitals; the page's client-side
  // `applyFilters` then matches the multi-bed selection on the larger set.
  // (Sending the first selected type as a backend hint would over-filter
  // and miss hospitals that offer other selected types but not the first.)
  if (state.bedTypes.length === 1) {
    params.bed_type = state.bedTypes[0]
  }

  // District — the backend only filters on district, not division.
  if (state.district !== "all") {
    params.district = state.district
  }

  // Cost range — sent when the user has narrowed it from the default.
  if (state.costRange[0] !== 0) params.cost_min = state.costRange[0]
  if (state.costRange[1] !== 20_000) params.cost_max = state.costRange[1]

  // Minimum rating.
  if (state.minRating > 0) params.min_rating = state.minRating

  // Only-available — backend accepts this flag.
  if (state.onlyAvailable) params.available_only = true

  // User location for distance ranking.
  if (state.userCoords) {
    params.lat = state.userCoords[1]
    params.lng = state.userCoords[0]
  }

  return params
}