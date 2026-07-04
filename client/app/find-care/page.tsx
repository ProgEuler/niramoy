"use client";

/**
 * PAGE 2 — Search Results (public, no login).
 *
 * Layout:
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │  StickySearchBar (Division · District · Bed · More ▾ · Search)│
 *   ├───────────────────────────────────────────────────────────────┤
 *   │  FilterPills (active pills + Clear All)                       │
 *   │  Result count   SortBar                ViewToggle             │
 *   ├───────────────────────────────────────────────────────────────┤
 *   │  List view  →  DetailResultsList stack                        │
 *   │  Map view   →  HospitalMap (full-width MapLibre)             │
 *   │  Empty      →  NoResultsState                                 │
 *   └───────────────────────────────────────────────────────────────┘
 *   CompareBar (bottom-fixed, appears at 2+ selections)
 *
 * URL params populate initial filter state (deep-linkable results).
 */

import { Suspense, useEffect, useMemo, useReducer } from "react";
import { useSearchParams } from "next/navigation";
import { SiteNavbar } from "@/components/home/site-navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { Disclaimer } from "@/components/find-care/disclaimer";
import { StickySearchBar } from "@/components/find-care/sticky-search-bar";
import { FilterPills } from "@/components/find-care/filter-pills";
import { ResultCountLabel } from "@/components/find-care/result-count-label";
import { SortBar } from "@/components/find-care/sort-bar";
import { ViewToggle } from "@/components/find-care/view-toggle";
import { DetailResultsList } from "@/components/find-care/detail-results-list";
import { NoResultsState } from "@/components/find-care/no-results-state";
import { CompareBar } from "@/components/find-care/compare-bar";
import { HospitalMap } from "@/components/find-care/hospital-map";
import { useHospitalStore } from "@/lib/use-hospital-store";
import {
  ALL_DIVISIONS,
  type BangladeshDivision,
  type BedType,
  type Hospital,
} from "@/lib/types/hospital";
import {
  INITIAL_FILTER_STATE,
  applyFilters,
  filterReducer,
} from "@/app/app/find-care/filters";

export default function FindCarePage() {
  return (
    <Suspense fallback={null}>
      <FindCarePageInner />
    </Suspense>
  );
}

function FindCarePageInner() {
  const params = useSearchParams();
  const { hospitals } = useHospitalStore();
  const [state, dispatch] = useReducer(filterReducer, INITIAL_FILTER_STATE);

  // Hydrate initial filter state from URL query string on mount.
  useEffect(() => {
    const division = params.get("division") as BangladeshDivision | null;
    const district = params.get("district");
    const beds = params.get("beds");
    if (division && ALL_DIVISIONS.includes(division)) {
      dispatch({ type: "SET_DIVISION", division });
    }
    if (district) {
      dispatch({ type: "SET_DISTRICT", district });
    }
    if (beds) {
      const wanted = beds
        .split(",")
        .filter((b): b is BedType => ["icu", "nicu", "ccu", "hdu"].includes(b));
      // Replace current selection so it matches the URL exactly.
      for (const b of ["icu", "nicu", "ccu", "hdu"] as BedType[]) {
        if (state.bedTypes.includes(b) && !wanted.includes(b)) {
          dispatch({ type: "TOGGLE_BED_TYPE", bedType: b });
        }
        if (!state.bedTypes.includes(b) && wanted.includes(b)) {
          dispatch({ type: "TOGGLE_BED_TYPE", bedType: b });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: only on mount

  const filtered = useMemo(
    () => applyFilters(hospitals, state),
    [hospitals, state],
  );

  const selectedHospital: Hospital | null = useMemo(() => {
    if (!state.selectedId) return null;
    return hospitals.find((h) => h.id === state.selectedId) ?? null;
  }, [hospitals, state.selectedId]);

  function handleHover(id: string | null) {
    dispatch({ type: "SET_HOVERED", id });
  }
  function handleSelect(id: string) {
    dispatch({
      type: "SET_SELECTED",
      id: state.selectedId === id ? null : id,
    });
  }
  function handleToggleCompare(id: string) {
    dispatch({ type: "TOGGLE_COMPARE", id });
  }

  // List view is a normal flex column; map view puts the map full-bleed.
  const isList = state.viewMode === "list";

  return (
    <>
      <SiteNavbar />
      <main className="flex min-h-[calc(100dvh-3.5rem)] flex-col pb-20">
        <StickySearchBar state={state} dispatch={dispatch} />

        <div id="results-anchor" className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="space-y-2 py-3">
            <FilterPills state={state} dispatch={dispatch} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ResultCountLabel
                count={filtered.length}
                state={state}
                totalHospitals={hospitals.length}
              />
              <div className="flex items-center gap-2">
                <SortBar value={state.sort} dispatch={dispatch} />
                <ViewToggle value={state.viewMode} dispatch={dispatch} />
              </div>
            </div>
          </div>

          {isList ? (
            <div className="pb-4">
              {filtered.length === 0 ? (
                <NoResultsState state={state} dispatch={dispatch} />
              ) : (
                <DetailResultsList
                  filtered={filtered}
                  userCoords={state.userCoords}
                  hoveredId={state.hoveredId}
                  selectedId={state.selectedId}
                  compareIds={state.compareIds}
                  onHover={handleHover}
                  onSelect={handleSelect}
                  onToggleCompare={handleToggleCompare}
                />
              )}
              <div className="mt-4">
                <Disclaimer />
              </div>
            </div>
          ) : (
            <div className="h-[calc(100dvh-13rem)] min-h-[480px] overflow-hidden rounded-lg border">
              <HospitalMap
                hospitals={filtered}
                hoveredId={state.hoveredId}
                selectedHospital={selectedHospital}
                userCoords={state.userCoords}
                onPointClick={(h) => handleSelect(h.id)}
                dispatch={dispatch}
              />
            </div>
          )}
        </div>
      </main>

      <CompareBar
        compareIds={state.compareIds}
        onRemove={(id) => dispatch({ type: "TOGGLE_COMPARE", id })}
      />

      <SiteFooter />
    </>
  );
}
