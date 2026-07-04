"use client";

import { IconHeartbeat, IconShieldCheck } from "@tabler/icons-react";
import { QuickSearch } from "@/components/home/quick-search";

/**
 * Hero — the first 60 seconds of a user in crisis. Headline, sub-headline,
 * search bar, and a single trust pill to combat "is this real?" doubt.
 */
export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-gradient-to-b from-niramoy-teal/5 via-background to-background"
    >
      {/* soft glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 -z-10 mx-auto h-64 max-w-3xl rounded-full bg-niramoy-teal/10 blur-3xl"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-4 py-12 text-center sm:px-6 sm:py-16 lg:py-20">
        <h1
          id="hero-heading"
          className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
        >
          Find ICU, NICU, CCU &amp; HDU Beds{" "}
          <span className="text-niramoy-teal">Near You</span> — Right Now
        </h1>

        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Real-time bed availability across hospitals in Bangladesh. Stop
          calling one hospital after another — see which one has space before
          you pick up the phone.
        </p>
      </div>
    </section>
  );
}
