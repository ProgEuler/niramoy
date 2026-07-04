"use client";

/**
 * Page-3 "Related hospitals" horizontal scroller. Other hospitals in the
 * same district with ICU beds available, plus a few fallback by division.
 * Horizontally scrollable strip with snap points for a tactile feel.
 */

import Link from "next/link";
import { useMemo } from "react";
import { IconChevronRight, IconMapPin, IconShieldCheck } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { useHospitalStore } from "@/lib/use-hospital-store";
import { haversineKm } from "@/lib/hospital-utils";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  hospital: Hospital;
}

export function RelatedHospitals({ hospital }: Props) {
  const { hospitals } = useHospitalStore();

  const related = useMemo(() => {
    const others = hospitals.filter((h) => h.id !== hospital.id);
    const sameDistrict = others.filter(
      (h) =>
        h.district === hospital.district && h.beds.icu.available > 0,
    );
    if (sameDistrict.length >= 3) {
      return sameDistrict
        .slice()
        .sort(
          (a, b) =>
            haversineKm([hospital.lng, hospital.lat], [a.lng, a.lat]) -
            haversineKm([hospital.lng, hospital.lat], [b.lng, a.lat]),
        )
        .slice(0, 8);
    }
    // Fallback: include division-level matches too.
    const fromDivision = others.filter(
      (h) =>
        h.division === hospital.division &&
        h.beds.icu.available > 0 &&
        !sameDistrict.includes(h),
    );
    return [...sameDistrict, ...fromDivision].slice(0, 8);
  }, [hospital, hospitals]);

  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-heading">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h2
            id="related-heading"
            className="font-heading text-sm font-semibold text-foreground sm:text-base"
          >
            Other hospitals in {hospital.district} with ICU beds
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Nearby alternatives if this hospital has no ICU space.
          </p>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto pb-2 sm:mx-0 sm:overflow-visible">
        <ul className="flex snap-x snap-mandatory gap-3 px-4 sm:px-0">
          {related.map((h) => {
            const distKm = haversineKm(
              [hospital.lng, hospital.lat],
              [h.lng, h.lat],
            );
            return (
              <li
                key={h.id}
                className="w-64 shrink-0 snap-start sm:w-60"
              >
                <Link
                  href={`/hospital/${h.id}`}
                  className="group block h-full focus-visible:outline-none"
                >
                  <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                    <CardContent className="flex h-full flex-col gap-1.5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-niramoy-teal">
                            {h.name}
                          </h3>
                          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <IconMapPin className="size-2.5" />
                            {h.district}
                            {distKm > 0 && (
                              <> · {distKm.toFixed(1)} km</>
                            )}
                          </p>
                        </div>
                        {h.verified && (
                          <IconShieldCheck className="size-3.5 shrink-0 text-niramoy-teal" />
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t pt-1.5 text-[11px]">
                        <span className="font-medium tabular-nums text-foreground">
                          ICU{" "}
                          <span style={{ color: "#22c55e" }}>
                            {h.beds.icu.available}
                          </span>
                          <span className="text-muted-foreground">
                            /{h.beds.icu.total}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors group-hover:text-niramoy-teal">
                          View
                          <IconChevronRight className="size-2.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
