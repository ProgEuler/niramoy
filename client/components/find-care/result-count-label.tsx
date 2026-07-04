"use client";

import type { BedType, Hospital } from "@/lib/types/hospital";
import type { FilterState } from "@/app/app/find-care/filters";

interface Props {
  count: number;
  state: FilterState;
  totalHospitals: number;
}

const BED_LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

/**
 * "Showing 14 hospitals in Dhaka with available ICU beds" — the canonical
 * one-line label that anchors the user in the result space. Falls back to
 * neutral wording when no specific division/district/bed type is selected.
 */
export function ResultCountLabel({ count, state, totalHospitals }: Props) {
  const loc =
    state.district !== "all"
      ? state.district
      : state.division !== "all"
        ? state.division
        : null;

  // First selected bed type drives the headline; we keep it simple instead of
  // enumerating combinations.
  const selectedBeds = state.bedTypes;
  const bedText =
    selectedBeds.length === 0
      ? "across all bed types"
      : selectedBeds.length === 4
        ? "across ICU, NICU, CCU & HDU beds"
        : `with available ${selectedBeds.map((b) => BED_LABEL[b]).join(" / ")} beds`;

  if (count === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No hospitals match these filters.{" "}
        <span className="text-foreground/70">
          (out of {totalHospitals} listed)
        </span>
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">
        Showing {count} {count === 1 ? "hospital" : "hospitals"}
      </span>
      {loc ? <> in {loc}</> : null} {bedText}.
    </p>
  );
}
