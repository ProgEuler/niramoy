"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FilterAction, GeoStatus, RadiusKm } from "@/app/app/find-care/filters";

interface Props {
  value: RadiusKm | null;
  geoStatus: GeoStatus;
  dispatch: React.Dispatch<FilterAction>;
}

const OPTIONS: { label: string; value: RadiusKm }[] = [
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "Nationwide", value: 25 }, // "Nationwide" means radius null but uses the pill affordance
];

export function RadiusPills({ value, geoStatus, dispatch }: Props) {
  const disabled = geoStatus !== "ok";

  return (
    <div
      role="group"
      aria-label="Search radius"
      className="flex flex-wrap gap-1.5"
    >
      {OPTIONS.map((opt) => {
        // Nationwide is encoded as radiusKm=null in state; others are literal km.
        const isNationwide = opt.label === "Nationwide";
        const isActive = isNationwide
          ? value === null
          : value === opt.value;
        return (
          <Tooltip key={opt.label}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                aria-pressed={isActive}
                disabled={disabled}
                className={cn(
                  "h-7 px-2.5 text-xs",
                  isActive && "bg-niramoy-teal text-white hover:bg-niramoy-teal/90",
                  disabled && "opacity-50",
                )}
                onClick={() =>
                  dispatch({
                    type: "SET_RADIUS",
                    radius: isNationwide ? null : opt.value,
                  })
                }
              >
                {opt.label}
              </Button>
            </TooltipTrigger>
            {disabled && (
              <TooltipContent>
                Use “Find Nearest” to enable radius filter
              </TooltipContent>
            )}
          </Tooltip>
        );
      })}
    </div>
  );
}
