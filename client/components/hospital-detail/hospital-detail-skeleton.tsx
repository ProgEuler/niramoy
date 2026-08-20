"use client";

/**
 * Loading skeleton for the /hospital/[id] detail page.
 *
 * Mirrors the structure of the loaded view (header strip + 4 bed cards +
 * info section + availability charts) so the layout doesn't jump when the
 * real data arrives. Uses the shadcn `<Skeleton>` primitive (pulse via
 * `animate-pulse`).
 */

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ALL_BED_TYPES } from "@/lib/types/hospital";

export function HospitalDetailSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Header strip */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-64 sm:h-8 sm:w-80" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>

      {/* Live bed availability — 4 cards in a row */}
      <section className="space-y-3">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_BED_TYPES.map((t) => (
            <Card key={t} size="sm" className="overflow-hidden">
              <CardContent className="space-y-2 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-7 w-20" />
                <div className="flex items-center justify-between border-t pt-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-3 w-56" />
      </section>

      {/* Info section: left card (about + map) + right card (contact list) */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card size="sm">
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-10/12" />
              <Skeleton className="h-3 w-9/12" />
            </div>
            <Skeleton className="h-48 w-full rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex flex-wrap gap-1.5">
                {ALL_BED_TYPES.map((t) => (
                  <Skeleton key={t} className="h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-28" />
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-10/12" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Availability charts: bed occupancy bar + activity line */}
      <section className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-baseline justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-44 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-baseline justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-44 w-full" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
