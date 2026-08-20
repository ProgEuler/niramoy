"use client"

import Link from "next/link"
import {
  IconArrowUpRight,
  IconClock,
  IconMapPin,
  IconPhone,
  IconRoute,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  availabilityColor,
  formatRelativeTime,
  formatTaka,
  getAvailabilityClass,
  haversineKm,
} from "@/lib/hospital-utils"
import { ALL_BED_TYPES } from "@/lib/types/hospital"
import type { BedType, Hospital } from "@/lib/types/hospital"
import { cn } from "@/lib/utils"
import VerifiedBadge from "../ui/verified-badge"

interface Props {
  hospital: Hospital
  /** User's location if geolocation is granted; used to show distance. */
  userCoords?: [number, number] | null
  /** Whether this card sits in the compare-tray selection. */
  inCompare?: boolean
  onToggleCompare?: () => void
  /** Whether the "Add to Compare" toggle should be shown at all. */
  showCompare?: boolean
}

const SHORT: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
}

const FULL: Record<BedType, string> = {
  icu: "Intensive Care Unit",
  nicu: "Neonatal ICU",
  ccu: "Coronary Care Unit",
  hdu: "High Dependency Unit",
}

export function HospitalDetailCard({
  hospital,
  userCoords,
  inCompare,
  onToggleCompare,
  showCompare,
}: Props) {
  // Price range across offered bed types — never show "৳0 – ৳0" for public.
  const offeredPrices = ALL_BED_TYPES.map((t) => hospital.price[t]).filter(
    (n) => n > 0
  )
  const minPrice = offeredPrices.length === 0 ? 0 : Math.min(...offeredPrices)
  const maxPrice = offeredPrices.length === 0 ? 0 : Math.max(...offeredPrices)
  const isFree = minPrice === 0 && maxPrice === 0
  const priceLabel = isFree
    ? "Free (public)"
    : minPrice === maxPrice
      ? formatTaka(minPrice)
      : `${formatTaka(minPrice)} – ${formatTaka(maxPrice)}`

  // Distance from user when available — only meaningful when geolocation is on.
  const distanceKm = userCoords
    ? haversineKm(userCoords, [hospital.lng, hospital.lat])
    : null

  const rating = hospital.rating ?? 0

  return (
    <Card className="overflow-hidden ring-1 ring-foreground/5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:ring-niramoy-teal/20">
      {/* Hero gradient — visible identity without depending on remote images. */}
      <div
        aria-hidden
        className="relative h-20 w-full overflow-hidden bg-gradient-to-br from-niramoy-teal/30 via-niramoy-teal/10 to-background"
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(14,158,142,0.45), transparent 40%), radial-gradient(circle at 80% 20%, rgba(34,197,94,0.35), transparent 40%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

        {/* Top-right badge cluster */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {distanceKm !== null && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-card/90 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
              <IconRoute className="size-2.5 text-niramoy-teal" />
              {distanceKm.toFixed(1)} km
            </span>
          )}
        </div>
      </div>

      <CardContent className="space-y-3 p-4">
        {/* Title + location */}
        <div>
          <span className="inline-flex items-center gap-1">
            <h3 className="font-heading text-base leading-tight font-semibold text-foreground sm:text-lg">
              {hospital.name}
            </h3>
            {hospital.verified && <VerifiedBadge />}
          </span>
          <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
            <IconMapPin className="mt-0.5 size-3 shrink-0" />
            <span className="line-clamp-2">
              {hospital.address}, {hospital.district}, {hospital.division}
            </span>
          </p>
        </div>

        {/* 4-bed availability grid */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {ALL_BED_TYPES.map((t) => {
            const { total, available } = hospital.beds[t]
            const cls = getAvailabilityClass(hospital, t)
            const color = availabilityColor(cls)
            const pct = total > 0 ? Math.round((available / total) * 100) : 0
            const isFree = total === 0

            return (
              <div
                key={t}
                className={cn(
                  "rounded-md border bg-card/50 p-2",
                  isFree && "opacity-60"
                )}
                title={FULL[t]}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-heading text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {SHORT[t]}
                  </span>
                  {!isFree && (
                    <span
                      className="text-[10px] font-semibold tabular-nums"
                      style={{ color }}
                    >
                      {pct}%
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div
                  className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={available}
                  aria-label={`${SHORT[t]} availability`}
                >
                  {!isFree && (
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  )}
                </div>

                <div className="mt-1 flex items-baseline justify-between gap-1">
                  <span className="text-xs font-semibold text-foreground tabular-nums">
                    {isFree ? (
                      <span className="text-[11px] text-muted-foreground">
                        N/A
                      </span>
                    ) : (
                      <>
                        <span style={{ color }}>{available}</span>
                        <span className="text-muted-foreground">/{total}</span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {isFree
                      ? "—"
                      : hospital.price[t] === 0
                        ? "Free"
                        : formatTaka(hospital.price[t])}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer meta: rating, last updated, price summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[11px] text-muted-foreground">
          <RatingStars value={rating} />
          <span className="flex items-center gap-1">
            <IconClock className="size-3" />
            {formatRelativeTime(hospital.last_updated)}
          </span>
          <span className="tabular-nums">
            <span className="font-medium text-foreground">{priceLabel}</span>{" "}
            <span className="text-muted-foreground">/ day</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
          <Button
            asChild
            size="sm"
            className="h-8 gap-1.5 bg-destructive px-3 text-xs text-white hover:bg-destructive/90"
          >
            <a
              href={`tel:${hospital.phone}`}
              aria-label={`Call ${hospital.name}`}
            >
              <IconPhone className="size-3.5" />
              Call
            </a>
          </Button>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 px-3 text-xs"
          >
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Get directions to ${hospital.name}`}
            >
              <IconRoute className="size-3.5" />
              Directions
            </a>
          </Button>

          {showCompare && (
            <Button
              type="button"
              size="sm"
              variant={inCompare ? "default" : "outline"}
              onClick={onToggleCompare}
              className={cn(
                "h-8 gap-1.5 px-3 text-xs",
                inCompare &&
                  "bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
              )}
            >
              {inCompare ? "In Compare" : "Compare"}
            </Button>
          )}

          <Button
            asChild
            size="sm"
            variant="ghost"
            className="ml-auto h-8 gap-1.5 px-2 text-xs"
          >
            <Link href={`/hospital/${hospital.id}`}>
              View Details
              <IconArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RatingStars({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`Rated ${value} out of 5`}
    >
      {[0, 1, 2, 3, 4].map((i) =>
        i < Math.round(value) ? (
          <IconStarFilled
            key={i}
            className="size-3 text-yellow-500"
            aria-hidden
          />
        ) : (
          <IconStar
            key={i}
            className="size-3 text-muted-foreground/40"
            aria-hidden
          />
        )
      )}
      <span className="ml-1 text-[11px] font-medium text-foreground tabular-nums">
        {value.toFixed(1)}
      </span>
    </span>
  )
}
