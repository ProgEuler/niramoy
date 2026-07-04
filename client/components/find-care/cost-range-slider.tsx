"use client";

import { useId } from "react";
import { Slider } from "@/components/ui/slider";
import { formatTaka } from "@/lib/hospital-utils";
import type { FilterAction } from "@/app/app/find-care/filters";

interface Props {
  value: [number, number];
  dispatch: React.Dispatch<FilterAction>;
  min?: number;
  max?: number;
  step?: number;
}

export function CostRangeSlider({
  value,
  dispatch,
  min = 0,
  max = 20_000,
  step = 500,
}: Props) {
  const labelId = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span id={labelId} className="text-muted-foreground">
          Cost per day
        </span>
        <span className="font-medium text-foreground tabular-nums">
          {formatTaka(value[0])} – {formatTaka(value[1])}
        </span>
      </div>
      <Slider
        aria-labelledby={labelId}
        min={min}
        max={max}
        step={step}
        value={value}
        minStepsBetweenThumbs={1}
        onValueChange={(v) => {
          if (v.length === 2) {
            dispatch({ type: "SET_COST_RANGE", range: [v[0], v[1]] });
          }
        }}
        className="mt-1"
      />
    </div>
  );
}
