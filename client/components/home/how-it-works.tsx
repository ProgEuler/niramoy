"use client";

import { IconSearch, IconArrowsHorizontal, IconPhoneCall } from "@tabler/icons-react";

const STEPS = [
  {
    n: 1,
    icon: IconSearch,
    title: "Search by area and bed type",
    body: "Pick your division and district, choose ICU, NICU, CCU or HDU, and see only the hospitals that match.",
  },
  {
    n: 2,
    icon: IconArrowsHorizontal,
    title: "Compare hospitals side by side",
    body: "Select up to four hospitals and we line up bed counts, prices, distance and ratings in one table.",
  },
  {
    n: 3,
    icon: IconPhoneCall,
    title: "Call the hospital and go",
    body: "Tap to call the emergency hotline directly. Get directions with one tap when you're ready to leave.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="bg-background"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-niramoy-teal">
            How Niramoy works
          </p>
          <h2
            id="how-heading"
            className="mt-1 font-heading text-2xl font-semibold text-foreground sm:text-3xl"
          >
            From search to bedside in three steps
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No accounts. No app download. Open the site on any phone and find a
            bed in under two minutes.
          </p>
        </div>

        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ n, icon: Icon, title, body }) => (
            <li
              key={n}
              className="relative flex flex-col gap-3 rounded-xl border bg-card p-5 ring-1 ring-foreground/5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-md bg-niramoy-teal text-white">
                  <Icon className="size-5" />
                </span>
                <span className="font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {n}
                </span>
              </div>
              <h3 className="font-heading text-base font-semibold text-foreground">
                {title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
