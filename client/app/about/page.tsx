"use client";

import Link from "next/link";
import {
  IconAlertTriangle,
  IconAmbulance,
  IconBuildingHospital,
  IconCircleCheck,
  IconCircleDot,
  IconHeartbeat,
  IconInfoCircle,
  IconMapPin,
  IconPhone,
  IconShieldCheck,
  IconStethoscope,
  IconUserShield,
  IconUsers,
} from "@tabler/icons-react";
import { SiteNavbar } from "@/components/home/site-navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { Disclaimer } from "@/components/find-care/disclaimer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: 1,
    icon: IconMapPin,
    title: "Search by area and bed type",
    body: "Pick your division and district, choose ICU, NICU, CCU or HDU, and see only the hospitals that match.",
  },
  {
    n: 2,
    icon: IconUsers,
    title: "Compare hospitals side by side",
    body: "Select up to four hospitals and we line up bed counts, prices, distance and ratings in one table.",
  },
  {
    n: 3,
    icon: IconPhone,
    title: "Call the hospital and go",
    body: "Tap to call the emergency hotline directly. Get directions with one tap when you're ready to leave.",
  },
] as const;

const BED_TYPES = [
  {
    abbr: "ICU",
    name: "Intensive Care Unit",
    desc: "For critically ill patients requiring constant monitoring and life support.",
    color: "bg-destructive/10 text-destructive",
  },
  {
    abbr: "NICU",
    name: "Neonatal Intensive Care Unit",
    desc: "For newborns who are premature or critically ill.",
    color: "bg-niramoy-teal/10 text-niramoy-teal",
  },
  {
    abbr: "CCU",
    name: "Coronary Care Unit",
    desc: "For patients with serious heart conditions.",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    abbr: "HDU",
    name: "High Dependency Unit",
    desc: "Step-down from ICU. More monitoring than a general ward, less than full ICU.",
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
] as const;

const AVAILABILITY_COLORS = [
  {
    label: "Green",
    meaning: "More than 50% of beds available",
    detail: "Safe to contact.",
    swatch: "bg-emerald-500",
  },
  {
    label: "Orange",
    meaning: "Between 10% and 50% of beds available",
    detail: "Limited.",
    swatch: "bg-amber-500",
  },
  {
    label: "Red",
    meaning: "Less than 10% available, or zero",
    detail: "Critical or full.",
    swatch: "bg-red-500",
  },
  {
    label: "Grey",
    meaning: "Not updated in more than 24 hours",
    detail: "Data may be stale.",
    swatch: "bg-zinc-400",
  },
] as const;

const AUDIENCES = [
  {
    icon: IconHeartbeat,
    title: "Patients and families",
    body: "Anyone in Bangladesh looking for a critical care bed. No account needed — open the site, find a hospital, make a call.",
    cta: { href: "/", label: "Find a bed" },
  },
  {
    icon: IconBuildingHospital,
    title: "Hospital admins",
    body: "Staff at registered hospitals who keep their own bed counts, pricing, and contact information up to date. Routed to their own dashboard after login.",
    cta: { href: "/login", label: "Hospital login" },
  },
  {
    icon: IconUserShield,
    title: "System admins",
    body: "The team running Niramoy itself. Approves new hospitals, manages accounts, moderates updates, and monitors platform health.",
    cta: { href: "/login", label: "System login" },
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <SiteNavbar />
      <main className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
        {/* Hero */}
        <section
          aria-labelledby="about-hero"
          className="relative isolate overflow-hidden border-b bg-gradient-to-b from-niramoy-teal/5 via-background to-background"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-24 -z-10 mx-auto h-64 max-w-3xl rounded-full bg-niramoy-teal/10 blur-3xl"
          />
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-niramoy-teal">
              <IconInfoCircle className="size-3.5" />
              About Niramoy
            </p>
            <h1
              id="about-hero"
              className="mt-2 max-w-3xl font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
            >
              One platform for{" "}
              <span className="text-niramoy-teal">critical care beds</span>{" "}
              across Bangladesh.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              <span className="font-medium text-foreground">নিরাময়</span>{" "}
              (Niramoy) means <em>cure</em> or <em>recovery</em> in Bengali.
              During a medical emergency, families should not have to call
              hospital after hospital to find out who has space. Niramoy puts
              the answer in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                size="sm"
                className="bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
              >
                <Link href="/find-care">Find beds now</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Why Niramoy */}
        <section
          aria-labelledby="why-heading"
          className="border-b bg-background"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-niramoy-teal">
                  The problem
                </p>
                <h2
                  id="why-heading"
                  className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
                >
                  Why this exists
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  In a medical emergency, the first question is almost always
                  the same: <em>where is there a bed?</em> Calling one hospital
                  after another burns precious minutes and rarely gets a clear
                  answer. Niramoy aggregates that information so a person in
                  crisis can find an available bed in minutes instead of hours.
                </p>
              </div>
              <Card className="grid gap-3 p-5 sm:grid-cols-3">
                {[
                  {
                    icon: IconAlertTriangle,
                    title: "No time to waste",
                    body: "Search and call in under two minutes.",
                  },
                  {
                    icon: IconShieldCheck,
                    title: "Real numbers",
                    body: "Verified hospitals with self-reported counts.",
                  },
                  {
                    icon: IconCircleCheck,
                    title: "One place",
                    body: "Stop dialing ten numbers. See who has space first.",
                  },
                ].map(({ icon: Icon, title, body }) => (
                  <div
                    key={title}
                    className="rounded-lg border bg-card p-4 ring-1 ring-foreground/5"
                  >
                    <span className="flex size-8 items-center justify-center rounded-md bg-niramoy-teal/10 text-niramoy-teal">
                      <Icon className="size-4" />
                    </span>
                    <h3 className="mt-3 font-heading text-sm font-semibold">
                      {title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          aria-labelledby="how-heading"
          className="border-b bg-muted/20"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-niramoy-teal">
                How Niramoy works
              </p>
              <h2
                id="how-heading"
                className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                From search to bedside in three steps
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                No accounts. No app download. Open the site on any phone and
                find a bed in under two minutes.
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

        {/* Who it's for */}
        <section
          aria-labelledby="audience-heading"
          className="border-b bg-background"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-niramoy-teal">
                Who uses Niramoy
              </p>
              <h2
                id="audience-heading"
                className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                Built for three groups
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {AUDIENCES.map(({ icon: Icon, title, body, cta }) => (
                <Card key={title} className="flex flex-col gap-3 p-5">
                  <span className="flex size-9 items-center justify-center rounded-md bg-niramoy-teal/10 text-niramoy-teal">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="font-heading text-base font-semibold">
                    {title}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                  <Link
                    href={cta.href}
                    className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-niramoy-teal hover:underline"
                  >
                    {cta.label} →
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* The four bed types */}
        <section
          aria-labelledby="bed-types-heading"
          className="border-b bg-muted/20"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-niramoy-teal">
                Critical care
              </p>
              <h2
                id="bed-types-heading"
                className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                The four bed types we track
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Every feature in Niramoy revolves around these four types. A
                hospital may offer any combination — and we show N/A
                honestly when they do not.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {BED_TYPES.map(({ abbr, name, desc, color }) => (
                <div
                  key={abbr}
                  className="flex flex-col gap-2 rounded-xl border bg-card p-5 ring-1 ring-foreground/5"
                >
                  <span
                    className={cn(
                      "inline-flex w-fit items-center rounded-md px-2 py-1 font-heading text-xs font-semibold",
                      color
                    )}
                  >
                    {abbr}
                  </span>
                  <h3 className="font-heading text-sm font-semibold">{name}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Availability color system */}
        <section
          aria-labelledby="color-heading"
          className="border-b bg-background"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-niramoy-teal">
                Color system
              </p>
              <h2
                id="color-heading"
                className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                How to read the map and search results
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Every bed count in the platform uses the same four colors. A
                grey marker means the data is stale — not that beds are
                unavailable.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {AVAILABILITY_COLORS.map(({ label, meaning, detail, swatch }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/5"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 inline-block size-3 shrink-0 rounded-full",
                      swatch
                    )}
                  />
                  <div>
                    <p className="font-heading text-sm font-semibold">
                      {label}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {meaning}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-foreground/80">
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Data honesty */}
        <section
          aria-labelledby="honesty-heading"
          className="border-b bg-muted/20"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-niramoy-teal">
                  What this platform is — and is not
                </p>
                <h2
                  id="honesty-heading"
                  className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
                >
                  Honest about how the data works
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Niramoy does not connect directly to any hospital&apos;s
                  internal patient management system. Hospitals self-report
                  their own bed counts through a portal. The data is only as
                  accurate as the hospital staff who update it. This is the
                  realistic model — no hospital in Bangladesh exposes its
                  internal systems to third parties, and we are transparent
                  about that.
                </p>
                <ul className="mt-5 space-y-3">
                  {[
                    "Every bed count shows the last updated timestamp. No number is shown without one.",
                    "Counts not updated in over 24 hours are shown with a grey stale indicator.",
                    "Every public page carries the same disclaimer: always call to confirm before traveling.",
                    "Verified hospitals (✓) have been confirmed by our team as real and reachable.",
                  ].map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-2 text-sm text-foreground/80"
                    >
                      <IconCircleDot className="mt-0.5 size-4 shrink-0 text-niramoy-teal" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Card className="space-y-4 p-5">
                <div>
                  <h3 className="font-heading text-sm font-semibold">
                    What Niramoy is not
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    <li>· Not connected to hospital internal systems.</li>
                    <li>· Does not show which specific beds are occupied.</li>
                    <li>· Does not handle bookings, reservations, or payments.</li>
                    <li>· Does not dispatch ambulances.</li>
                    <li>· Does not provide medical advice.</li>
                  </ul>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-heading text-sm font-semibold">
                    What it does do
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    <li>· Aggregates self-reported bed counts in one place.</li>
                    <li>· Surfaces hospitals nearby with available beds.</li>
                    <li>· Provides tap-to-call emergency numbers.</li>
                    <li>· Updates the map in real time as hospitals report.</li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Get involved / CTA */}
        <section
          aria-labelledby="cta-heading"
          className="border-b bg-background"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-niramoy-teal">
                Get involved
              </p>
              <h2
                id="cta-heading"
                className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                Help us cover every hospital in Bangladesh
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Niramoy is only useful if hospitals participate. If your
                facility is not listed yet, register it. If you spot a problem,
                let us know.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="flex flex-col gap-3 p-5">
                <span className="flex size-9 items-center justify-center rounded-md bg-niramoy-teal/10 text-niramoy-teal">
                  <IconBuildingHospital className="size-5" />
                </span>
                <h3 className="font-heading text-base font-semibold">
                  Register a hospital
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Add your facility to the platform. Once verified, your admin
                  team can log in and update bed counts in real time.
                </p>
                <Button asChild size="sm" className="mt-auto w-fit bg-niramoy-teal text-white hover:bg-niramoy-teal/90">
                  <Link href="/register">Start registration</Link>
                </Button>
              </Card>

              <Card className="flex flex-col gap-3 p-5">
                <span className="flex size-9 items-center justify-center rounded-md bg-niramoy-teal/10 text-niramoy-teal">
                  <IconStethoscope className="size-5" />
                </span>
                <h3 className="font-heading text-base font-semibold">
                  Hospital admin
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Already registered? Log in to update bed counts, pricing, and
                  contact details for your hospital.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-auto w-fit">
                  <Link href="/login">Hospital login</Link>
                </Button>
              </Card>

              <Card className="flex flex-col gap-3 p-5">
                <span className="flex size-9 items-center justify-center rounded-md bg-niramoy-teal/10 text-niramoy-teal">
                  <IconShieldCheck className="size-5" />
                </span>
                <h3 className="font-heading text-base font-semibold">
                  Built on DGHS data
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Hospital listings are seeded from the public Directorate
                  General of Health Services registry. We use it to ensure the
                  platform starts with verified hospital names and locations.
                </p>
                <a
                  href="https://dghs.gov.bd"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-auto inline-flex w-fit items-center gap-1 text-xs font-medium text-niramoy-teal hover:underline"
                >
                  Visit DGHS ↗
                </a>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
