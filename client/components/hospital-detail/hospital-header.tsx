"use client";

import Link from "next/link";
import {
  IconBookmark,
  IconMapPin,
  IconPhone,
  IconRoute,
  IconShieldCheck,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  hospital: Hospital;
  inCompare: boolean;
  onToggleCompare: () => void;
}

/**
 * Page-3 hero banner. Name, district, verification badge, hospital hero
 * placeholder (since we don't have real images), and the three spec
 * action buttons: Call Emergency · Get Directions · Add to Compare.
 */
export function HospitalHeader({ hospital, inCompare, onToggleCompare }: Props) {
  return (
    <section className="relative">
      {/* Hero placeholder — keeps the layout without external image deps. */}
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-niramoy-teal/30 via-niramoy-teal/10 to-background sm:h-48">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(14,158,142,0.4), transparent 40%), radial-gradient(circle at 80% 20%, rgba(34,197,94,0.3), transparent 40%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="mx-auto -mt-12 w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {hospital.name}
              </h1>
              {hospital.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-niramoy-teal px-2 py-0.5 text-[11px] font-semibold text-white">
                  <IconShieldCheck className="size-3" />
                  Verified
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
              <IconMapPin className="size-3.5" />
              {hospital.district}, {hospital.division}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button
              asChild
              size="default"
              className="h-8 gap-1.5 bg-destructive px-3 text-xs text-white hover:bg-destructive/90"
            >
              <a href={`tel:${hospital.phone}`} aria-label="Call emergency">
                <IconPhone className="size-3.5" />
                Call Emergency
              </a>
            </Button>
            <Button
              asChild
              size="default"
              variant="outline"
              className="h-8 gap-1.5 px-3 text-xs"
            >
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconRoute className="size-3.5" />
                Get Directions
              </a>
            </Button>
            <Button
              type="button"
              size="default"
              variant={inCompare ? "default" : "outline"}
              onClick={onToggleCompare}
              className={
                inCompare
                  ? "h-8 gap-1.5 bg-niramoy-teal px-3 text-xs text-white hover:bg-niramoy-teal/90"
                  : "h-8 gap-1.5 px-3 text-xs"
              }
            >
              <IconBookmark className="size-3.5" />
              {inCompare ? "In Compare" : "Add to Compare"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
