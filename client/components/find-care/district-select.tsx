"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDistricts } from "@/lib/use-districts"
import type { BangladeshDivision } from "@/lib/types/hospital"
import type { FilterAction } from "@/lib/filters"

interface Props {
  division: BangladeshDivision | "all"
  value: string
  dispatch: React.Dispatch<FilterAction>
}

export function DistrictSelect({ division, value, dispatch }: Props) {
  const districts = useDistricts(division)
  const disabled = division === "all"

  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(v) => dispatch({ type: "SET_DISTRICT", district: v })}
    >
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={disabled ? "Select a division first" : "All districts"}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All districts</SelectItem>
        {districts.map((d) => (
          <SelectItem key={d} value={d}>
            {d}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
