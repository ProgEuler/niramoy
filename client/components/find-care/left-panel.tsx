"use client";

/**
 * The left (or bottom-sheet) panel. Composition only — all behavior lives in
 * the child components or the page-level reducer.
 *
 * Receives every filter value + dispatch + a callback for hover/select so the
 * map can react via the parent.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LiveStatsBar } from "@/components/find-care/live-stats-bar";
import { BedTypeToggles } from "@/components/find-care/bed-type-toggles";
import { DivisionSelect } from "@/components/find-care/division-select";
import { DistrictSelect } from "@/components/find-care/district-select";
import { CostRangeSlider } from "@/components/find-care/cost-range-slider";
import { AvailabilityToggle } from "@/components/find-care/availability-toggle";
import { RadiusPills } from "@/components/find-care/radius-pills";
import { FindNearestButton } from "@/components/find-care/find-nearest-button";
import { ClearFiltersButton } from "@/components/find-care/clear-filters-button";
import { SortBar } from "@/components/find-care/sort-bar";
import { ResultsList } from "@/components/find-care/results-list";
import { Disclaimer } from "@/components/find-care/disclaimer";
import { GeoErrorBanner } from "@/components/find-care/geo-error-banner";
import type {
  FilterAction,
  FilterState,
} from "@/app/app/find-care/filters";
import type { Hospital, HospitalStats } from "@/lib/types/hospital";

interface Props {
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  stats: HospitalStats;
  filtered: Hospital[];
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export function LeftPanel({
  state,
  dispatch,
  stats,
  filtered,
  onHover,
  onSelect,
}: Props) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <LiveStatsBar stats={stats} />

      <Card size="sm">
        <CardContent className="space-y-3">
          <Section label="Bed type">
            <BedTypeToggles selected={state.bedTypes} dispatch={dispatch} />
          </Section>
          <Section label="Division">
            <DivisionSelect value={state.division} dispatch={dispatch} />
          </Section>
          <Section label="District">
            <DistrictSelect
              division={state.division}
              value={state.district}
              dispatch={dispatch}
            />
          </Section>
          <Section label="Availability">
            <AvailabilityToggle
              value={state.onlyAvailable}
              dispatch={dispatch}
            />
          </Section>
          <Section label="Cost per day">
            <CostRangeSlider value={state.costRange} dispatch={dispatch} />
          </Section>
          <Section label="Search radius">
            <RadiusPills
              value={state.radiusKm}
              geoStatus={state.geoStatus}
              dispatch={dispatch}
            />
          </Section>
          <FindNearestButton geoStatus={state.geoStatus} dispatch={dispatch} />
          <GeoErrorBanner geoStatus={state.geoStatus} />
          <ClearFiltersButton dispatch={dispatch} />
        </CardContent>
      </Card>

      <Separator />

      <SortBar value={state.sort} dispatch={dispatch} />

      <ResultsList
        filtered={filtered}
        userCoords={state.userCoords}
        hoveredId={state.hoveredId}
        selectedId={state.selectedId}
        onHover={onHover}
        onSelect={onSelect}
      />

      <Disclaimer />
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}