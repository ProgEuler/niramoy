"use client";

import { IconLayoutList, IconMap } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FilterAction, ViewMode } from "@/app/app/find-care/filters";

interface Props {
  value: ViewMode;
  dispatch: React.Dispatch<FilterAction>;
}

export function ViewToggle({ value, dispatch }: Props) {
  return (
    <div
      role="group"
      aria-label="View toggle"
      className="inline-flex h-7 items-center rounded-md border bg-card p-0.5 shadow-sm"
    >
      <ToggleButton
        active={value === "list"}
        onClick={() => dispatch({ type: "SET_VIEW_MODE", mode: "list" })}
        label="List view"
        icon={<IconLayoutList className="size-3.5" />}
      />
      <ToggleButton
        active={value === "map"}
        onClick={() => dispatch({ type: "SET_VIEW_MODE", mode: "map" })}
        label="Map view"
        icon={<IconMap className="size-3.5" />}
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
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
      <span className="hidden sm:inline">
        {active ? label.replace(" view", "") : label.replace(" view", "")}
      </span>
    </Button>
  );
}
