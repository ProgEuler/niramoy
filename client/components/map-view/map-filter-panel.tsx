"use client";

/**
 * Page-5 left filter panel. Compact: bed-type multi-select, division +
 * district, "only available" toggle, radius slider, and the "Find Nearest"
 * button. The Map View page owns filter state so the map can react.
 */

import { Card, CardContent } from "@/components/ui/card";
import { BedTypeToggles } from "@/components/find-care/bed-type-toggles";
import { DivisionSelect } from "@/components/find-care/division-select";
import { DistrictSelect } from "@/components/find-care/district-select";
import { AvailabilityToggle } from "@/components/find-care/availability-toggle";
import { RadiusPills } from "@/components/find-care/radius-pills";
import { FindNearestButton } from "@/components/find-care/find-nearest-button";
import { GeoErrorBanner } from "@/components/find-care/geo-error-banner";
import type {
  FilterAction,
  FilterState,
} from "@/app/app/find-care/filters";

interface Props {
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
}

export function MapFilterPanel({ state, dispatch }: Props) {
  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-3">
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
          <Section label="Search radius">
            <RadiusPills
              value={state.radiusKm}
              geoStatus={state.geoStatus}
              dispatch={dispatch}
            />
          </Section>
        </CardContent>
      </Card>

      <FindNearestButton geoStatus={state.geoStatus} dispatch={dispatch} />
      <GeoErrorBanner geoStatus={state.geoStatus} />
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
