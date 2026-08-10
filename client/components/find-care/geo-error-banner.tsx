"use client"

import { IconAlertTriangle } from "@tabler/icons-react"
import type { GeoStatus } from "@/lib/filters"

interface Props {
  geoStatus: GeoStatus
}

export function GeoErrorBanner({ geoStatus }: Props) {
  if (geoStatus === "denied") {
    return (
      <Banner>
        Location permission denied. Search by division / district instead.
      </Banner>
    )
  }
  if (geoStatus === "error") {
    return (
      <Banner>
        Couldn’t access your location. Search by division / district instead.
      </Banner>
    )
  }
  return null
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400"
    >
      <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
