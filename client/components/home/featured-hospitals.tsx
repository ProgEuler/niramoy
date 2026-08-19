"use client"

import Link from "next/link"
import {
  IconArrowRight,
  IconShieldCheck,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react"
import { Card, CardContent } from "@/components/ui/card"
import { BedChip } from "@/components/find-care/bed-chip"
import { useFeaturedHospitals } from "@/lib/hooks/use-featured-hospitals"
import { ALL_BED_TYPES } from "@/lib/types/hospital"
import type { Hospital } from "@/lib/types/hospital"
import { FeaturedCardSkeletonGrid } from "./featured-card-skeleton"
import { BadgeCheck } from "lucide-react"

const MAX_CARDS = 8

export function FeaturedHospitals() {
  const { hospitals, isLoading, isError, error, refetch } =
    useFeaturedHospitals(MAX_CARDS)

  const featured = hospitals.slice(0, MAX_CARDS)

  return (
    <section aria-labelledby="featured-heading" className="bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wider text-niramoy-teal uppercase">
              Top rated
            </p>
            <h2
              id="featured-heading"
              className="mt-1 font-heading text-2xl font-semibold text-foreground sm:text-3xl"
            >
              Featured hospitals
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Verified hospitals with the highest ratings and current
              availability.
            </p>
          </div>
          <Link
            href="/find-care"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-niramoy-teal hover:underline"
          >
            See all hospitals
            <IconArrowRight className="size-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <FeaturedCardSkeletonGrid count={MAX_CARDS} />
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p>
              Couldn&apos;t load featured hospitals
              {error?.message ? `: ${error.message}` : "."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-destructive underline-offset-2 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : featured.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hospitals available right now.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((h) => (
              <li key={h.id}>
                <FeaturedCard hospital={h} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function FeaturedCard({ hospital }: { hospital: Hospital }) {
  const rating = hospital.rating ?? 0
  const verified = hospital.verified
  return (
    <Link
      href={`/hospital/${hospital.id}`}
      className="group block h-full focus-visible:outline-none"
    >
      <Card className="h-full group-hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-2 p-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h3 className="truncate font-semibold text-foreground group-hover:text-niramoy-teal">
                  {hospital.name}
                </h3>
                {verified && <BadgeCheck size={16} fill="#0E9E8E" />}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {hospital.district}, {hospital.division}
              </p>
            </div>
          </div>

          {/* Bed availability row */}
          <div className="flex flex-wrap gap-x-2.5 gap-y-1 rounded-md bg-muted/40 px-2 py-1.5">
            {ALL_BED_TYPES.map((t) => (
              <BedChip key={t} hospital={hospital} type={t} density="compact" />
            ))}
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between pt-1">
            <RatingStars value={rating} />
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-niramoy-teal">
              View
              <IconArrowRight className="size-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function RatingStars({ value }: { value: number }) {
  // Render 5 stars; the proportion of filled stars matches the rating.
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`Rated ${value} out of 5`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < Math.round(value)
        return filled ? (
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
      })}
      <span className="ml-1 text-[11px] font-medium text-foreground tabular-nums">
        {value.toFixed(1)}
      </span>
    </span>
  )
}
