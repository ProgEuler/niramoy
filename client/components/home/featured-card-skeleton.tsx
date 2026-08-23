"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton that mirrors the layout of `FeaturedCard` in
 * `featured-hospitals.tsx`. Same Card + CardContent shape, same
 * header / bed-row / footer proportions so the grid doesn't jump
 * when real data lands.
 */
export function FeaturedCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-2 p-3">
        {/* Header: name + verified badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>

        {/* Bed availability row */}
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 rounded-md bg-muted/40 px-2 py-1.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>

        {/* Footer: stars + view link */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid of `count` placeholder cards. Use while the featured fetch
 * is in flight.
 */
export function FeaturedCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <FeaturedCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
