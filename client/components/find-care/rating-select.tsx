"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FilterAction } from "@/lib/filters"

interface Props {
  value: number
  dispatch: React.Dispatch<FilterAction>
}

const OPTIONS = [
  { value: 0, label: "Any rating" },
  { value: 3, label: "3★ & up" },
  { value: 4, label: "4★ & up" },
  { value: 4.5, label: "4.5★ & up" },
]

export function RatingSelect({ value, dispatch }: Props) {
  return (
    <Select
      value={String(value)}
      onValueChange={(v) =>
        dispatch({ type: "SET_MIN_RATING", rating: Number(v) })
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Any rating" />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={String(o.value)}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
