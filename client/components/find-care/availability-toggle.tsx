"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { FilterAction } from "@/app/app/find-care/filters";

interface Props {
  value: boolean;
  dispatch: React.Dispatch<FilterAction>;
}

export function AvailabilityToggle({ value, dispatch }: Props) {
  return (
    <label className="flex items-center gap-2 text-xs text-foreground">
      <Checkbox
        checked={value}
        onCheckedChange={() => dispatch({ type: "TOGGLE_ONLY_AVAILABLE" })}
        aria-label="Show only hospitals with available beds"
      />
      Show only hospitals with available beds
    </label>
  );
}
