"use client";

/**
 * PAGE 6 — Ambulance Directory (public, no login).
 *
 * Sections:
 *   1. National hotlines (pinned at top, always visible)
 *   2. District filter
 *   3. Directory cards grouped by division
 *
 * No login. No map. Pure list view. The two pinned hotline cards (999, 16401)
 * are duplicated inside the data file as well — they show up in the
 * Dhaka division and at the top regardless of filter selection.
 */

import { useMemo, useState } from "react";
import { IconArrowRight, IconAmbulance } from "@tabler/icons-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteNavbar } from "@/components/home/site-navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { Disclaimer } from "@/components/find-care/disclaimer";
import { NationalHotlines } from "@/components/ambulance/national-hotlines";
import { AmbulanceCard } from "@/components/ambulance/ambulance-card";
import { useAmbulanceStore } from "@/lib/use-ambulance-store";
import {
  ALL_DIVISIONS,
  type BangladeshDivision,
} from "@/lib/types/hospital";

export default function AmbulancePage() {
  const { ambulances } = useAmbulanceStore();
  const [district, setDistrict] = useState<string>("all");

  // Build a sorted district list across all divisions (deduped, alphabetical).
  const allDistricts = useMemo(() => {
    return Array.from(
      new Set(ambulances.map((a) => a.district)),
    ).sort((a, b) => a.localeCompare(b));
  }, [ambulances]);

  // Group filtered ambulances by division.
  const grouped = useMemo(() => {
    const filtered =
      district === "all"
        ? ambulances
        : ambulances.filter((a) => a.district === district);

    const out: Record<BangladeshDivision, typeof ambulances> = {} as never;
    for (const d of ALL_DIVISIONS) out[d] = [];
    for (const a of filtered) {
      (out[a.division] ??= []).push(a);
    }
    return out;
  }, [ambulances, district]);

  const visibleCount = Object.values(grouped).reduce(
    (s, list) => s + list.length,
    0,
  );

  return (
    <>
      <SiteNavbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
            <IconAmbulance className="mr-1 inline-block size-3.5 align-middle" />
            Emergency
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Ambulance Directory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reach private, government, and NGO ambulance services across
            Bangladesh. Numbers are tap-to-call.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Filter rail (desktop) */}
          <aside className="space-y-3">
            <div className="sticky top-20 space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Filter by district
                </label>
                <Select value={district} onValueChange={setDistrict}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All districts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All districts</SelectItem>
                    {allDistricts.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {visibleCount} {visibleCount === 1 ? "service" : "services"}{" "}
                  {district !== "all" ? `in ${district}` : "listed"}
                </p>
              </div>

              <div className="rounded-lg border bg-card p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  While you wait
                </p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                  If the line is busy, try the national DGHS hotline
                  <span className="font-mono"> 16401</span> — they can dispatch
                  an ambulance to your location.
                </p>
              </div>

              <Link
                href="/find-care"
                className="inline-flex items-center gap-1 text-xs font-medium text-niramoy-teal hover:underline"
              >
                Find hospital beds nearby
                <IconArrowRight className="size-3" />
              </Link>
            </div>
          </aside>

          {/* Main column */}
          <div className="space-y-5">
            <NationalHotlines />

            {visibleCount === 0 ? (
              <div className="rounded-lg border border-dashed bg-card/50 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No ambulance services in <strong>{district}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setDistrict("all")}
                  className="mt-2 text-xs font-medium text-niramoy-teal hover:underline"
                >
                  Show all districts →
                </button>
              </div>
            ) : (
              ALL_DIVISIONS.map((div) => {
                const items = grouped[div];
                if (!items || items.length === 0) return null;
                return (
                  <section key={div} aria-labelledby={`division-${div}`}>
                    <h2
                      id={`division-${div}`}
                      className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold text-foreground sm:text-base"
                    >
                      {div}
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
                        {items.length}
                      </span>
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map((a) => (
                        <AmbulanceCard key={a.id} ambulance={a} />
                      ))}
                    </div>
                  </section>
                );
              })
            )}

            <Disclaimer />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
