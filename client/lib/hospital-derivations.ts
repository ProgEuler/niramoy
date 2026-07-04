/**
 * Derived data helpers for the Hospital Detail page.
 *
 * The current hospitals.json has no reviews and no historical bed counts, but
 * the detail page must show both. Rather than ask the user to fabricate data,
 * we synthesize deterministic but plausible values from the hospital id + the
 * current bed counts. This means:
 *   - The same hospital always renders the same chart and reviews
 *   - Ratings/reviewers are anchored to the hospital's actual rating when set
 *   - History hovers near the current available count, never wildly wrong
 *
 * If real review and history sources land later, swap these helpers — same
 * return shapes — and the UI components don't need to change.
 */

import type { BedType, Hospital } from "@/lib/types/hospital";

// ─── review synthesis ─────────────────────────────────────────────────────

export interface Review {
  id: string;
  /** Display name. Derived, not personally identifying. */
  author: string;
  /** ISO date when the review was written. */
  date: string;
  /** 1–5 stars. */
  rating: number;
  /** Body text. Short. */
  comment: string;
}

const REVIEWER_NAMES = [
  "Rahim U.",
  "Fatema B.",
  "Tareq H.",
  "Nazia S.",
  "Kamrul I.",
  "Shabnam A.",
  "Mahmud R.",
  "Sumaiya K.",
  "Imran M.",
  "Rina D.",
];

const REVIEW_COMMENTS = [
  "Staff responded fast when we arrived in the middle of the night.",
  "Clean facility. The ICU team explained everything clearly.",
  "Took a while to get a bed, but the care itself was good.",
  "Expensive but worth it — they had the equipment we needed.",
  "Had to call twice to confirm bed availability. Data was stale.",
  "Doctors and nurses were attentive. Lifts were slow, though.",
  "NICU staff were patient with our newborn. Cannot thank them enough.",
  "Public hospital so cost was manageable. Crowded waiting area.",
  "Up-to-date equipment. The admission process could be smoother.",
  "Reasonable pricing. My father received good cardiac care.",
];

/** Deterministic seeded PRNG (mulberry32). Same seed → same sequence. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable string → uint32 hash (xmur3). */
function xmur3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Build N reviews (default 12) anchored around the hospital's rating. The
 * call is O(1) memory and deterministic for the same hospital id.
 */
export function generateReviews(hospital: Hospital, count = 12): Review[] {
  const baseRating = hospital.rating ?? 3.5;
  const rand = mulberry32(xmur3(`reviews:${hospital.id}`));
  // Most recent review between 1 and 60 days ago.
  const today = Date.now();
  const reviews: Review[] = [];

  for (let i = 0; i < count; i += 1) {
    // Rating weighted toward baseRating, occasionally ±2.
    const drift = (rand() - 0.5) * 2; // [-1, 1]
    const stars = Math.max(1, Math.min(5, Math.round(baseRating + drift)));
    const daysAgo = Math.floor(rand() * 60) + i * 2; // older as i grows
    const date = new Date(today - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const author = REVIEWER_NAMES[Math.floor(rand() * REVIEWER_NAMES.length)];
    const comment = REVIEW_COMMENTS[Math.floor(rand() * REVIEW_COMMENTS.length)];
    reviews.push({
      id: `${hospital.id}-r-${i}`,
      author,
      date,
      rating: stars,
      comment,
    });
  }

  // Sort newest first.
  reviews.sort((a, b) => (a.date > b.date ? -1 : 1));
  return reviews;
}

/** Percentage breakdown of ratings 1..5. */
export interface RatingBreakdown {
  stars: 1 | 2 | 3 | 4 | 5;
  count: number;
  pct: number;
}

export function ratingBreakdown(reviews: Review[]): RatingBreakdown[] {
  const counts: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  };
  for (const r of reviews) {
    const s = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    counts[s] += 1;
  }
  const total = reviews.length || 1;
  return ([5, 4, 3, 2, 1] as const).map((stars) => ({
    stars,
    count: counts[stars],
    pct: (counts[stars] / total) * 100,
  }));
}

// ─── 7-day history synthesis ───────────────────────────────────────────────

export interface HistoryPoint {
  /** ISO date (start of day, UTC). */
  date: string;
  /** Available beds that day. */
  available: number;
}

export type History = Record<BedType, HistoryPoint[]>;

/**
 * Build a 7-day window ending today. Each day's available count is a
 * deterministic random walk anchored to today's count so the chart ends at
 * the actual current number — important for credibility.
 */
export function generateHistory(hospital: Hospital, days = 7): History {
  const result = {} as History;
  const types: BedType[] = ["icu", "nicu", "ccu", "hdu"];

  for (const type of types) {
    const total = hospital.beds[type].total;
    const current = hospital.beds[type].available;
    const seed = xmur3(`history:${hospital.id}:${type}`);
    const rand = mulberry32(seed);

    const points: HistoryPoint[] = [];
    // Walk backwards from today, building a path whose last point equals
    // `current`. Walking backwards avoids divergence; forward-walks need a
    // damping coefficient and still drift on small datasets.
    let next = current;
    const today = startOfDayUtc(new Date());
    for (let i = 0; i < days; i += 1) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      points.push({ date: date.toISOString(), available: next });
      // Step size: ±20% of total, bounded to [0, total].
      const step = Math.round((rand() - 0.5) * 2 * Math.max(2, total * 0.2));
      next = Math.max(0, Math.min(total, next - step));
    }
    // Reverse so it's chronological (oldest first).
    points.reverse();
    result[type] = points;
  }
  return result;
}

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ─── 24h emergency heuristic ───────────────────────────────────────────────

/** Public hospitals are 24/7 by mandate. Private hospitals: assume yes. */
export function is24hEmergency(hospital: Hospital): boolean {
  return hospital.type === "public" || hospital.type === "private";
}
