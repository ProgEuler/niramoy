"use client";

/**
 * Page-3 reviews & ratings. Overall star rating, breakdown bar chart,
 * individual review cards with pagination (10 per page), and a "Write a
 * Review" button (gated to logged-in patients).
 */

import { useMemo, useState } from "react";
import {
  IconEdit,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  generateReviews,
  ratingBreakdown,
  type Review,
} from "@/lib/hospital-derivations";
import { cn } from "@/lib/utils";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  hospital: Hospital;
}

const PAGE_SIZE = 10;

export function ReviewsSection({ hospital }: Props) {
  const reviews = useMemo(() => generateReviews(hospital), [hospital]);
  const [page, setPage] = useState(1);
  const breakdown = useMemo(() => ratingBreakdown(reviews), [reviews]);
  const totalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE));
  const visible = reviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const avg = useMemo(
    () => reviews.reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.length),
    [reviews],
  );

  return (
    <section aria-labelledby="reviews-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="reviews-heading"
            className="font-heading text-sm font-semibold text-foreground sm:text-base"
          >
            Reviews & ratings
          </h2>
          <p className="text-[11px] text-muted-foreground">
            What patients and families have said about this hospital.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          disabled
          title="Patient login required to write a review"
        >
          <IconEdit className="size-3.5" />
          Write a Review
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Summary card */}
        <Card size="sm">
          <CardContent className="space-y-3 p-4">
            <div className="text-center">
              <div className="font-heading text-4xl font-semibold tabular-nums text-foreground">
                {avg.toFixed(1)}
              </div>
              <div className="mt-0.5 flex justify-center">
                {[0, 1, 2, 3, 4].map((i) =>
                  i < Math.round(avg) ? (
                    <IconStarFilled
                      key={i}
                      className="size-4 text-yellow-500"
                    />
                  ) : (
                    <IconStar
                      key={i}
                      className="size-4 text-muted-foreground/40"
                    />
                  ),
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {reviews.length} reviews
              </div>
            </div>

            {/* Breakdown bars */}
            <ul className="space-y-1.5 text-[11px]">
              {breakdown.map((row) => (
                <li key={row.stars} className="flex items-center gap-2">
                  <span className="w-6 text-right tabular-nums text-muted-foreground">
                    {row.stars}★
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-yellow-500"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="w-6 tabular-nums text-muted-foreground">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Reviews list */}
        <div>
          {visible.length === 0 ? (
            <Card size="sm">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No reviews yet. Be the first to share your experience.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {visible.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-niramoy-teal/10 text-[11px] font-semibold text-niramoy-teal">
              {review.author.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground">
                {review.author}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(review.date).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
          <div className="flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={cn(
                  "inline-block",
                  i < review.rating
                    ? "text-yellow-500"
                    : "text-muted-foreground/30",
                )}
                aria-hidden
              >
                ★
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-foreground/90">
          {review.comment}
        </p>
      </CardContent>
    </Card>
  );
}
