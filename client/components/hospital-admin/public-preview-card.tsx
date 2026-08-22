"use client";

import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { BedChip } from "@/components/find-care/bed-chip";
import { ALL_BED_TYPES } from "@/lib/types/hospital";
import type { Hospital } from "@/lib/types/hospital";
import { formatRelativeTime } from "@/lib/hospital-utils";

interface Props {
  hospital: Hospital;
}

export function PublicPreviewCard({ hospital }: Props) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Public profile preview
            </h3>
            <p className="text-[11px] text-muted-foreground">
              How patients see your hospital.
            </p>
          </div>
          <Link
            href={`/hospital/${hospital.id}`}
            target="_blank"
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-niramoy-teal hover:underline"
          >
            Preview on site
            <IconExternalLink className="size-2.5" />
          </Link>
        </div>

        <div className="rounded-md border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">
                {hospital.name}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {hospital.district}, {hospital.division}
              </div>
            </div>
            {hospital.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-niramoy-teal px-2 py-0.5 text-[10px] font-semibold text-white">
                ✓ Verified
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1">
            {ALL_BED_TYPES.map((t) => (
              <BedChip
                key={t}
                hospital={hospital}
                type={t}
                density="compact"
              />
            ))}
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">
            Last updated {formatRelativeTime(hospital.last_updated)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
