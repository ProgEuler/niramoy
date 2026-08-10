"use client"

import { Button } from "@/components/ui/button"
import type { FilterAction } from "@/lib/filters"

interface Props {
  dispatch: React.Dispatch<FilterAction>
}

export function ClearFiltersButton({ dispatch }: Props) {
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto p-0 text-xs text-muted-foreground"
      onClick={() => {
        dispatch({ type: "CLEAR_ALL" })
        dispatch({ type: "SET_GEO_STATUS", status: "idle" })
        dispatch({ type: "SET_USER_COORDS", coords: null })
      }}
    >
      Clear all filters
    </Button>
  )
}
