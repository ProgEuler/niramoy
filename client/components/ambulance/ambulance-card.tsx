"use client";

/**
 * One ambulance service card. Large tap-to-call phone button per AGENTS.md
 * emergency-accessibility rules ("phone numbers must always be tappable on
 * mobile"). 24h badge; type badge (Govt/Private/NGO).
 */

import { IconPhone, IconShieldCheck, IconClock } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Ambulance } from "@/lib/types/ambulance";

interface Props {
  ambulance: Ambulance;
}

const TYPE_META: Record<
  Ambulance["type"],
  { label: string; className: string }
> = {
  government: {
    label: "Govt",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  private: {
    label: "Private",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  ngo: {
    label: "NGO",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
};

export function AmbulanceCard({ ambulance }: Props) {
  const meta = TYPE_META[ambulance.type];
  return (
    <Card size="sm">
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {ambulance.name}
            </h3>
            {ambulance.organization && (
              <p className="truncate text-[11px] text-muted-foreground">
                {ambulance.organization}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {ambulance.district}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                meta.className,
              )}
            >
              {ambulance.type === "government" && (
                <IconShieldCheck className="size-2.5" />
              )}
              {meta.label}
            </span>
            {ambulance.available24h && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[10px] font-semibold text-[#22c55e]">
                <IconClock className="size-2.5" />
                24h
              </span>
            )}
          </div>
        </div>

        {/* Large tap-to-call phone — emergency accessibility rule */}
        <a
          href={`tel:${ambulance.phone}`}
          className="flex items-center justify-between gap-2 rounded-md border border-niramoy-teal/30 bg-niramoy-teal/5 px-3 py-2.5 text-niramoy-teal transition-colors hover:bg-niramoy-teal/10 active:bg-niramoy-teal/15"
          aria-label={`Call ${ambulance.name} at ${ambulance.phone}`}
        >
          <span className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-niramoy-teal text-white">
              <IconPhone className="size-4" />
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {ambulance.phone}
            </span>
          </span>
          <span className="text-[11px] font-medium text-niramoy-teal/80">
            Tap to call
          </span>
        </a>
      </CardContent>
    </Card>
  );
}
