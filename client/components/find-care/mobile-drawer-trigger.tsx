"use client";

import { useState } from "react";
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
import { IconFilter, IconX } from "@tabler/icons-react";
import { LeftPanel } from "@/components/find-care/left-panel";
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
  resultCount: number;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export function MobileDrawerTrigger({
  state,
  dispatch,
  stats,
  filtered,
  resultCount,
  onHover,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon-lg"
          className="fixed bottom-4 right-4 z-30 rounded-full bg-niramoy-teal text-white shadow-lg hover:bg-niramoy-teal/90 lg:hidden"
          aria-label="Open filters and results"
        >
          <IconFilter />
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
        className="max-h-[85dvh] gap-0 overflow-hidden p-0"
      >
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Filters & Results</SheetTitle>
              <SheetDescription>
                Narrow the map by bed type, division, and availability.
              </SheetDescription>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <IconX />
            </Button>
          </div>
        </SheetHeader>
        <div className="max-h-[calc(85dvh-3.5rem)] overflow-y-auto">
          <LeftPanel
            state={state}
            dispatch={dispatch}
            stats={stats}
            filtered={filtered}
            onHover={onHover}
            onSelect={onSelect}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}