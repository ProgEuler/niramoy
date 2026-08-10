"use client"

/**
 * Top-level page for Find-a-Hospital.
 *
 * Owns filter state via `useReducer`, reads hospitals through the single
 * real-time seam (`useHospitalStore`), and renders the split layout —
 * LeftPanel + HospitalMap on desktop, LeftPanel-inside-Sheet + map on
 * mobile. The map cluster layer is fed a memoized FeatureCollection, the
 * result list sees the filtered array via useDeferredValue.
 */

import { useMemo, useReducer } from "react"
import { useHospitalStore } from "@/lib/use-hospital-store"
import {
  INITIAL_FILTER_STATE,
  applyFilters,
  filterReducer,
} from "@/lib/filters"
import { LeftPanel } from "@/components/find-care/left-panel"
import { HospitalMap } from "@/components/find-care/hospital-map"
import { MobileDrawerTrigger } from "@/components/find-care/mobile-drawer-trigger"
import type { Hospital } from "@/lib/types/hospital"

export default function HospitalFinderPage() {
  const { hospitals, stats } = useHospitalStore()
  const [state, dispatch] = useReducer(filterReducer, INITIAL_FILTER_STATE)

  // Filtered + sorted array — single source of truth for both list and map.
  const filtered = useMemo(
    () => applyFilters(hospitals, state),
    [hospitals, state]
  )

  // The hospital currently showing in the popup. Lives in state so the
  // close-handler can clear it.
  const selectedHospital: Hospital | null = useMemo(() => {
    if (!state.selectedId) return null
    return hospitals.find((h) => h.id === state.selectedId) ?? null
  }, [hospitals, state.selectedId])

  // Hover/select handlers — dispatch to the reducer so they're a stable
  // identity the map can use without re-rendering on every render.
  function handleHover(id: string | null) {
    dispatch({ type: "SET_HOVERED", id })
  }
  function handleSelect(id: string) {
    if (state.selectedId === id) {
      dispatch({ type: "SET_SELECTED", id: null })
    } else {
      dispatch({ type: "SET_SELECTED", id })
    }
  }

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] w-full">
      {/* Desktop left panel (lg+). */}
      <aside className="hidden w-[420px] shrink-0 overflow-hidden border-r bg-background lg:block">
        <LeftPanel
          state={state}
          dispatch={dispatch}
          stats={stats}
          filtered={filtered}
          onHover={handleHover}
          onSelect={handleSelect}
        />
      </aside>

      {/* Map (always full height) */}
      <main className="relative min-w-0 flex-1">
        <HospitalMap
          hospitals={filtered}
          hoveredId={state.hoveredId}
          selectedHospital={selectedHospital}
          userCoords={state.userCoords}
          onPointClick={(h) => handleSelect(h.id)}
          dispatch={dispatch}
        />
      </main>

      {/* Mobile FAB + bottom drawer (<lg). */}
      <div className="lg:hidden">
        <MobileDrawerTrigger
          state={state}
          dispatch={dispatch}
          stats={stats}
          filtered={filtered}
          resultCount={filtered.length}
          onHover={handleHover}
          onSelect={handleSelect}
        />
      </div>
    </div>
  )
}
