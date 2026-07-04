"use client";

import { useEffect, useState } from "react";
import {
  IconBuildingHospital,
  IconHeartbeat,
  IconBabyBottle,
  IconClock,
  IconActivity,
} from "@tabler/icons-react";
import { useHospitalStore } from "@/lib/use-hospital-store";
import { formatRelativeTime } from "@/lib/hospital-utils";

/**
 * Public live stats. The store already exposes aggregates; we additionally
 * poll a re-render every 60s so the "Last updated" tile ticks over visibly
 * even when the underlying data is static (static JSON in dev).
 */
const REFRESH_MS = 60_000;

export function LiveStatsStrip() {
  const { stats } = useHospitalStore();
  // Bump this once a minute to force the relative-time formatter to re-eval.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      aria-labelledby="stats-heading"
      className="border-y bg-muted/30"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="stats-heading"
            className="font-heading text-sm font-semibold text-foreground"
          >
            Platform at a glance
          </h2>
          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[#22c55e]" />
            </span>
            Auto-refresh · 60s
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            icon={<IconBuildingHospital className="size-4" />}
            label="Hospitals listed"
            value={stats.totalHospitals.toLocaleString()}
            accent="teal"
          />
          <StatCard
            icon={<IconHeartbeat className="size-4" />}
            label="ICU beds available"
            value={stats.icuAvailable.toLocaleString()}
            accent="green"
          />
          <StatCard
            icon={<IconBabyBottle className="size-4" />}
            label="NICU beds available"
            value={stats.nicuAvailable.toLocaleString()}
            accent="green"
          />
          <StatCard
            icon={<IconClock className="size-4" />}
            label="Last updated"
            // The `tick` is only here to invalidate `formatRelativeTime`.
            value={formatRelativeTime(stats.lastUpdatedMax)}
            sublabel={new Date(stats.lastUpdatedMax).toLocaleTimeString()}
            accent="muted"
            key={tick}
          />
        </div>
      </div>
    </section>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  accent: "teal" | "green" | "muted";
}

const ACCENT_RING: Record<StatCardProps["accent"], string> = {
  teal: "ring-niramoy-teal/20",
  green: "ring-[#22c55e]/20",
  muted: "ring-border",
};

const ACCENT_ICON: Record<StatCardProps["accent"], string> = {
  teal: "bg-niramoy-teal/10 text-niramoy-teal",
  green: "bg-[#22c55e]/10 text-[#22c55e]",
  muted: "bg-muted text-muted-foreground",
};

function StatCard({ icon, label, value, sublabel, accent }: StatCardProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border bg-card p-3 ring-1 ${ACCENT_RING[accent]}`}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${ACCENT_ICON[accent]}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium text-muted-foreground">
          {label}
        </div>
        <div className="font-heading text-lg font-semibold tabular-nums text-foreground sm:text-xl">
          {value}
        </div>
        {sublabel && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <IconActivity className="size-2.5" />
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
