"use client";

import { useId } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterAction, SortKey } from "@/app/app/find-care/filters";

interface Props {
  value: SortKey;
  dispatch: React.Dispatch<FilterAction>;
}

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "nearest", label: "Nearest" },
  { value: "available", label: "Most Available" },
  { value: "cost", label: "Lowest Cost" },
  { value: "rating", label: "Top Rated" },
];

export function SortBar({ value, dispatch }: Props) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        Sort by
      </label>
      <Select
        value={value}
        onValueChange={(v) =>
          dispatch({ type: "SET_SORT", sort: v as SortKey })
        }
      >
        <SelectTrigger id={id} className="h-7 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
