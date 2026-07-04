"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  IconArrowRight,
  IconShieldCheck,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { BedChip } from "@/components/find-care/bed-chip";
import { useHospitalStore } from "@/lib/use-hospital-store";
import { ALL_BED_TYPES } from "@/lib/types/hospital";
import type { Hospital } from "@/lib/types/hospital";

/**
 * Six to eight curated featured cards. Sort: rating desc, then available ICU
 * desc, then alphabetical. Tied to the same store as the rest of the app so
 * the cards reflect whatever the JSON currently holds.
 */
const MAX_CARDS = 8;

export function FeaturedHospitals() {
  const { hospitals } = useHospitalStore();

  const featured = useMemo<Hospital[]>(() => {
    return hospitals
      .filter((h) => h.verified)
      .slice()
      .sort((a, b) => {
        const r = (b.rating ?? 0) - (a.rating ?? 0);
        if (r !== 0) return r;
        const icuDiff = b.beds.icu.available - a.beds.icu.available;
        if (icuDiff !== 0) return icuDiff;
        return a.name.localeCompare(b.name);
      })
      .slice(0, MAX_CARDS);
  }, [hospitals]);

  return (
    <section
      aria-labelledby="featured-heading"
      className="bg-background"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-niramoy-teal">
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

        {featured.length === 0 ? (
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
  );
}

function FeaturedCard({ hospital }: { hospital: Hospital }) {
  const rating = hospital.rating ?? 0;
  return (
    <Link
      href={`/hospital/${hospital.id}`}
      className="group block h-full focus-visible:outline-none"
    >
      <Card className="h-full transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-2 p-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-foreground group-hover:text-niramoy-teal">
                {hospital.name}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {hospital.district}, {hospital.division}
              </p>
            </div>
            {hospital.verified && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-niramoy-teal px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <IconShieldCheck className="size-2.5" />
                Verified
              </span>
            )}
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
  );
}

function RatingStars({ value }: { value: number }) {
  // Render 5 stars; the proportion of filled stars matches the rating.
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rated ${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < Math.round(value);
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
        );
      })}
      <span className="ml-1 text-[11px] font-medium tabular-nums text-foreground">
        {value.toFixed(1)}
      </span>
    </span>
  );
}
