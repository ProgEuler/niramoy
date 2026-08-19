"use client"

import Link from "next/link"
import {
  IconBookmark,
  IconMapPin,
  IconPhone,
  IconRoute,
  IconShieldCheck,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import type { Hospital } from "@/lib/types/hospital"
import { BadgeCheck } from "lucide-react"

interface Props {
  hospital: Hospital
  inCompare: boolean
  onToggleCompare: () => void
}

export function HospitalHeader({
  hospital,
  inCompare,
  onToggleCompare,
}: Props) {
  return (
    <section className="relative">
      <div className="mx-auto -mt-12 w-full max-w-7xl px-4 pt-24 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {hospital.name}
              </h1>
              {hospital.verified && <BadgeCheck fill="#0E9E8E" />}
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
            {/* <Button
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
            </Button> */}
          </div>
        </div>
      </div>
    </section>
  )
}
