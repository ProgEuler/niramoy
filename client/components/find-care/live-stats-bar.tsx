"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconBuildingHospital, IconClock } from "@tabler/icons-react";
import { formatRelativeTime } from "@/lib/hospital-utils";
import type { HospitalStats } from "@/lib/types/hospital";

interface Props {
  stats: HospitalStats;
}

export function LiveStatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatTile
        icon={<IconBuildingHospital className="size-3.5" />}
        label="Hospitals"
        value={stats.totalHospitals.toLocaleString()}
      />
      <StatTile
        icon={<IconClock className="size-3.5" />}
        label="Last updated"
        value={formatRelativeTime(stats.lastUpdatedMax)}
        sublabel={new Date(stats.lastUpdatedMax).toLocaleTimeString()}
      />
      <StatTile
        label="ICU beds available"
        value={stats.icuAvailable.toLocaleString()}
        highlight
      />
      <StatTile
        label="NICU beds available"
        value={stats.nicuAvailable.toLocaleString()}
        highlight
      />
    </div>
  );
}

interface TileProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  highlight?: boolean;
}

function StatTile({ icon, label, value, sublabel, highlight }: TileProps) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1 py-3">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold tabular-nums">{value}</span>
          {highlight && <Badge className="bg-[#22c55e] text-white hover:bg-[#22c55e]/90">live</Badge>}
        </div>
        {sublabel && (
          <div className="text-[10px] text-muted-foreground">{sublabel}</div>
        )}
      </CardContent>
    </Card>
  );
}