"use client";

/**
 * PAGE 5 — Full Map View (public, no login).
 *
 * Layout (desktop, lg+):
 *   ┌───────────────┬─────────────────────────────────────────┐
 *   │ Filter Panel  │  Map canvas (Marker or Heatmap view)     │
 *   │ (320 px)      │  with collapsible results sidebar        │
 *   │               │  (right, 340 px) overlay                 │
 *   └───────────────┴─────────────────────────────────────────┘
 *
 * Mobile (<lg): the filter panel becomes a bottom-sheet trigger (FAB),
 * the sidebar becomes the same FAB. Map fills the viewport.
 *
 * The actual map implementation reuses MapLibre (already in the codebase).
 * The "Google Maps + markerclusterer" call in the spec maps directly onto
 * MapLibre's MapClusterLayer component with identical behavior.
 */

import { useEffect, useMemo, useReducer, useState } from "react";
import {
  IconFilter,
  IconLayout2,
  IconLayoutGrid,
  IconList,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SiteNavbar } from "@/components/home/site-navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { Disclaimer } from "@/components/find-care/disclaimer";
import { HospitalMap } from "@/components/find-care/hospital-map";
import { MapFilterPanel } from "@/components/map-view/map-filter-panel";
import { MapResultsSidebar } from "@/components/map-view/map-results-sidebar";
import { AvailabilityHeatmap } from "@/components/map-view/availability-heatmap";
import { useHospitalStore } from "@/lib/use-hospital-store";
import {
  applyFilters,
  filterReducer,
  INITIAL_FILTER_STATE,
} from "@/app/app/find-care/filters";
import type { Hospital } from "@/lib/types/hospital";
import { cn } from "@/lib/utils";

type ViewMode = "marker" | "heatmap";

export default function MapPage() {
  const { hospitals } = useHospitalStore();
  const [state, dispatch] = useReducer(filterReducer, INITIAL_FILTER_STATE);
  const [viewMode, setViewMode] = useState<ViewMode>("marker");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Auto-collapse sidebar on narrower viewports so the map has room.
  useEffect(() => {
    function handle() {
      if (typeof window === "undefined") return;
      if (window.innerWidth < 1280) setSidebarOpen(false);
      else setSidebarOpen(true);
    }
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const filtered = useMemo(
    () => applyFilters(hospitals, state),
    [hospitals, state],
  );

  const selectedHospital: Hospital | null = useMemo(() => {
    if (!state.selectedId) return null;
    return hospitals.find((h) => h.id === state.selectedId) ?? null;
  }, [hospitals, state.selectedId]);

  function handleSelect(id: string) {
    dispatch({
      type: "SET_SELECTED",
      id: state.selectedId === id ? null : id,
    });
  }

  const resultCount = filtered.length;

  return (
    <>
      <SiteNavbar />
      <main className="flex h-[calc(100dvh-3.5rem)] flex-col">
        {/* View-toggle strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card/80 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-foreground">
              {resultCount} {resultCount === 1 ? "hospital" : "hospitals"}
            </span>
            <span className="text-muted-foreground">
              {state.division !== "all" ? `· ${state.division}` : ""}
              {state.district !== "all" ? ` · ${state.district}` : ""}
            </span>
            {state.geoStatus === "ok" && (
              <Badge className="bg-[#22c55e] text-white hover:bg-[#22c55e]/90">
                Sorted by distance
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div
              role="group"
              aria-label="View mode"
              className="inline-flex h-7 items-center rounded-md border bg-card p-0.5 shadow-sm"
            >
              <ToggleButton
                active={viewMode === "marker"}
                onClick={() => setViewMode("marker")}
                icon={<IconLayout2 className="size-3.5" />}
                label="Markers"
              />
              <ToggleButton
                active={viewMode === "heatmap"}
                onClick={() => setViewMode("heatmap")}
                icon={<IconLayoutGrid className="size-3.5" />}
                label="Heatmap"
              />
            </div>

            {/* Sidebar toggle (desktop only) */}
            <Button
              type="button"
              size="sm"
              variant={sidebarOpen ? "default" : "outline"}
              className={cn(
                "hidden h-7 gap-1 px-2 text-xs lg:inline-flex",
                sidebarOpen && "bg-niramoy-teal text-white hover:bg-niramoy-teal/90",
              )}
              onClick={() => setSidebarOpen((v) => !v)}
              aria-pressed={sidebarOpen}
            >
              <IconList className="size-3.5" />
              List
            </Button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* Desktop filter panel */}
          <aside className="hidden w-[320px] shrink-0 overflow-hidden border-r bg-background lg:block">
            <MapFilterPanel state={state} dispatch={dispatch} />
          </aside>

          {/* Map canvas */}
          <div className="relative min-w-0 flex-1">
            {viewMode === "marker" ? (
              <HospitalMap
                hospitals={filtered}
                hoveredId={state.hoveredId}
                selectedHospital={selectedHospital}
                userCoords={state.userCoords}
                onPointClick={(h) => handleSelect(h.id)}
                dispatch={dispatch}
              />
            ) : (
              <HeatmapCanvas
                hospitalCount={filtered.length}
                highlightDivision={
                  state.division !== "all" ? state.division : null
                }
              />
            )}

            {/* Mobile filter FAB */}
            <div className="absolute bottom-4 left-4 z-30 lg:hidden">
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    size="icon-lg"
                    className="rounded-full bg-niramoy-teal text-white shadow-lg hover:bg-niramoy-teal/90"
                    aria-label="Open filters"
                  >
                    <IconFilter />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="max-h-[80dvh] gap-0 overflow-hidden p-0"
                >
                  <SheetHeader className="border-b px-4 py-3">
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>
                      Narrow the map by bed type, location, and radius.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="max-h-[calc(80dvh-5rem)] overflow-y-auto">
                    <MapFilterPanel state={state} dispatch={dispatch} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Mobile results FAB */}
            <div className="absolute bottom-4 right-4 z-30 lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    size="icon-lg"
                    className="rounded-full bg-card text-foreground shadow-lg"
                    aria-label="Open results list"
                  >
                    <IconList />
                    {resultCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1.5"
                      >
                        {resultCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="max-h-[80dvh] gap-0 overflow-hidden p-0"
                >
                  <SheetHeader className="border-b px-4 py-3">
                    <SheetTitle>Results</SheetTitle>
                    <SheetDescription>
                      Sorted by distance from you when available.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="max-h-[calc(80dvh-5rem)] overflow-y-auto">
                    <ResultsListBody
                      hospitals={filtered}
                      userCoords={state.userCoords}
                      hoveredId={state.hoveredId}
                      selectedId={state.selectedId}
                      onHover={(id) =>
                        dispatch({ type: "SET_HOVERED", id })
                      }
                      onSelect={handleSelect}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Desktop sidebar */}
          {sidebarOpen && (
            <div className="hidden lg:block">
              <MapResultsSidebar
                hospitals={filtered}
                userCoords={state.userCoords}
                hoveredId={state.hoveredId}
                selectedId={state.selectedId}
                onHover={(id) => dispatch({ type: "SET_HOVERED", id })}
                onSelect={handleSelect}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          )}
        </div>

        <div className="border-t bg-card/60 px-4 py-1.5 backdrop-blur sm:px-6">
          <Disclaimer />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "h-6 gap-1 rounded-sm px-2 text-[11px] font-medium",
        active
          ? "bg-niramoy-teal text-white hover:bg-niramoy-teal/90 hover:text-white"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

function HeatmapCanvas({
  hospitalCount,
  highlightDivision,
}: {
  hospitalCount: number;
  highlightDivision: import("@/lib/types/hospital").BangladeshDivision | null;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-sky-50 dark:bg-slate-900">
      {/* Soft gradient backdrop so the choropleth reads even with no data. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-sky-100 via-sky-50 to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"
      />
      <AvailabilityHeatmap highlightDivision={highlightDivision} />
      <div className="absolute bottom-3 left-3 rounded-md border bg-card/90 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
        <div className="font-semibold text-foreground">
          {hospitalCount} hospitals · district heatmap
        </div>
        <div className="text-muted-foreground">
          Color shows aggregate ICU availability per division.
        </div>
      </div>
    </div>
  );
}

function ResultsListBody({
  hospitals,
  userCoords,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}: {
  hospitals: Hospital[];
  userCoords: [number, number] | null;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  // Used by the mobile sheet — reuses the same logic as the desktop sidebar
  // but inside the sheet content. Same component, no separate props.
  return (
    <MapResultsSidebar
      hospitals={hospitals}
      userCoords={userCoords}
      hoveredId={hoveredId}
      selectedId={selectedId}
      onHover={onHover}
      onSelect={onSelect}
      onClose={() => {}}
    />
  );
}
