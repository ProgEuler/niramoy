"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconMapPin, IconSearch, IconBed } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { DivisionSelect } from "@/components/find-care/division-select";
import { DistrictSelect } from "@/components/find-care/district-select";
import { BedTypeToggles } from "@/components/find-care/bed-type-toggles";
import type {
  BangladeshDivision,
  BedType,
} from "@/lib/types/hospital";

/**
 * Inline quick-search reducer — the home page is its own scope, so a small
 * reducer keeps the search bar state out of URL/router state and avoids the
 * heavy `filterReducer` from the Find-Care page.
 */
interface QuickSearchState {
  division: BangladeshDivision | "all";
  district: string;
  bedTypes: BedType[];
}

type QuickSearchAction =
  | { type: "SET_DIVISION"; division: BangladeshDivision | "all" }
  | { type: "SET_DISTRICT"; district: string }
  | { type: "TOGGLE_BED_TYPE"; bedType: BedType };

const INITIAL: QuickSearchState = {
  division: "all",
  district: "all",
  bedTypes: [],
};

// Reuse the same action shapes so we can plug `BedTypeToggles` directly.
// The find-care components expect a `Dispatch<FilterAction>` — we adapt via a
// thin shim in this component.
import type { FilterAction } from "@/app/app/find-care/filters";

export function QuickSearch() {
  const [state, setState] = useState<QuickSearchState>(INITIAL);
  const router = useRouter();

  const dispatch: React.Dispatch<FilterAction> = ((action: FilterAction) => {
    setState((prev) => {
      switch (action.type) {
        case "SET_DIVISION":
          return {
            ...prev,
            division: action.division,
            district: "all",
          };
        case "SET_DISTRICT":
          return { ...prev, district: action.district };
        case "TOGGLE_BED_TYPE": {
          const has = prev.bedTypes.includes(action.bedType);
          return {
            ...prev,
            bedTypes: has
              ? prev.bedTypes.filter((b) => b !== action.bedType)
              : [...prev.bedTypes, action.bedType],
          };
        }
        default:
          return prev;
      }
    });
  }) as React.Dispatch<FilterAction>;

  function handleSearch() {
    const params = new URLSearchParams();
    if (state.division !== "all") params.set("division", state.division);
    if (state.district !== "all") params.set("district", state.district);
    if (state.bedTypes.length > 0) params.set("beds", state.bedTypes.join(","));
    const qs = params.toString();
    router.push(qs ? `/find-care?${qs}` : "/find-care");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSearch();
      }}
      className="rounded-xl border bg-card p-3 shadow-sm ring-1 ring-foreground/5 sm:p-4"
      aria-label="Quick bed search"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
        <Field
          icon={<IconMapPin className="size-3.5 text-muted-foreground" />}
          label="Division"
        >
          <DivisionSelect value={state.division} dispatch={dispatch} />
        </Field>

        <Field
          icon={<IconMapPin className="size-3.5 text-muted-foreground" />}
          label="District"
        >
          <DistrictSelect
            division={state.division}
            value={state.district}
            dispatch={dispatch}
          />
        </Field>

        <Field
          icon={<IconBed className="size-3.5 text-muted-foreground" />}
          label="Bed type"
        >
          <BedTypeToggles selected={state.bedTypes} dispatch={dispatch} />
        </Field>

        <Button
          type="submit"
          size="lg"
          className="h-9 gap-1.5 bg-niramoy-teal px-4 text-sm text-white hover:bg-niramoy-teal/90 lg:h-9"
        >
          <IconSearch className="size-4" />
          Search
        </Button>
      </div>
    </form>
  );
}

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function Field({ icon, label, children }: FieldProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {icon}
        {label}
      </label>
      <div className="w-full">{children}</div>
    </div>
  );
}
