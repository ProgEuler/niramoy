"use client";

/**
 * Page-3 hospital info section: address, embedded map, phones, hours,
 * facility-type checks, and an about paragraph. The "embedded map" reuses
 * the MapLibre shell with a single marker.
 */

import { useEffect, useState } from "react";
import {
  IconBuildingHospital,
  IconCheck,
  IconClock24,
  IconMapPin,
  IconPhone,
  IconX,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Map, MapMarker, MarkerContent, MapControls } from "@/components/ui/map";
import { is24hEmergency } from "@/lib/hospital-derivations";
import { ALL_BED_TYPES } from "@/lib/types/hospital";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  hospital: Hospital;
}

const FULL: Record<string, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

export function HospitalInfoSection({ hospital }: Props) {
  const is24h = is24hEmergency(hospital);
  // Mount flag prevents the MapLibre canvas from initializing during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section
      aria-labelledby="info-heading"
      className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"
    >
      <Card size="sm">
        <CardContent className="space-y-4 p-4">
          <div>
            <h2
              id="info-heading"
              className="font-heading text-sm font-semibold text-foreground sm:text-base"
            >
              About this hospital
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {hospital.type === "public"
                ? `${hospital.name} is a public, government-run hospital in ${hospital.district}. It serves patients regardless of ability to pay and is supported by the Directorate General of Health Services (DGHS).`
                : `${hospital.name} is a private hospital in ${hospital.district}. It offers paid critical care services and is registered with the DGHS.`}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <Row icon={<IconMapPin className="size-3.5" />} label="Address">
              <span>{hospital.address}</span>
            </Row>
            <Row icon={<IconPhone className="size-3.5" />} label="Emergency hotline">
              <a
                href={`tel:${hospital.phone}`}
                className="font-medium text-niramoy-teal hover:underline"
              >
                {hospital.phone}
              </a>
            </Row>
            <Row icon={<IconClock24 className="size-3.5" />} label="Operating hours">
              {is24h ? (
                <span className="inline-flex items-center gap-1 font-medium text-[#22c55e]">
                  <span className="size-1.5 rounded-full bg-[#22c55e]" />
                  24h Emergency
                </span>
              ) : (
                <span className="text-muted-foreground">Hours not listed</span>
              )}
            </Row>
            <Row
              icon={<IconBuildingHospital className="size-3.5" />}
              label="Hospital type"
            >
              <span className="capitalize">{hospital.type}</span>
            </Row>
          </div>

          {/* Facility type checklist */}
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Facility types
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-1.5">
              {ALL_BED_TYPES.map((t) => {
                const offered = hospital.beds[t].total > 0;
                return (
                  <li
                    key={t}
                    className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs"
                  >
                    {offered ? (
                      <span className="flex size-4 items-center justify-center rounded-full bg-[#22c55e]/15 text-[#22c55e]">
                        <IconCheck className="size-3" />
                      </span>
                    ) : (
                      <span className="flex size-4 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <IconX className="size-3" />
                      </span>
                    )}
                    <span className="font-medium">{FULL[t]}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {offered ? "Available" : "Not offered"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="overflow-hidden">
        <CardContent className="p-0">
          {mounted ? (
            <div className="relative h-72 w-full sm:h-80">
              <Map
                center={[hospital.lng, hospital.lat]}
                zoom={14}
                fadeDuration={0}
              >
                <MapMarker
                  longitude={hospital.lng}
                  latitude={hospital.lat}
                >
                  <MarkerContent>
                    <div className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-niramoy-teal text-white shadow-lg">
                      <IconMapPin className="size-3.5" />
                    </div>
                  </MarkerContent>
                </MapMarker>
                <MapControls showZoom />
              </Map>
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center bg-muted text-xs text-muted-foreground sm:h-80">
              Loading map…
            </div>
          )}
          <div className="border-t bg-card p-3 text-[11px] text-muted-foreground">
            <span className="font-mono">
              {hospital.lat.toFixed(4)}, {hospital.lng.toFixed(4)}
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-foreground">{children}</div>
      </div>
    </div>
  );
}
