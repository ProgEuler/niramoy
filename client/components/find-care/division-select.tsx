"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_DIVISIONS } from "@/lib/types/hospital";
import type { BangladeshDivision } from "@/lib/types/hospital";
import type { FilterAction } from "@/app/app/find-care/filters";

interface Props {
  value: BangladeshDivision | "all";
  dispatch: React.Dispatch<FilterAction>;
}

export function DivisionSelect({ value, dispatch }: Props) {
  return (
    <Select
      value={value}
      onValueChange={(v) =>
        dispatch({
          type: "SET_DIVISION",
          division: v as BangladeshDivision | "all",
        })
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="All divisions" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All divisions</SelectItem>
        {ALL_DIVISIONS.map((d) => (
          <SelectItem key={d} value={d}>
            {d}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
