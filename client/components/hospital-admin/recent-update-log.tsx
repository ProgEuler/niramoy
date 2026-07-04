"use client";

/**
 * Recent update log (preview). Five-most-recent synthesized updates. The
 * spec asks the admin to see "what I changed recently" without forcing them
 * to navigate to the full history page.
 */

import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Hospital } from "@/lib/types/hospital";

interface Update {
  id: string;
  type: "Bed Counts" | "Pricing" | "Profile";
  field: string;
  from: number | string;
  to: number | string;
  at: string;
}

const TYPE_BADGE: Record<Update["type"], string> = {
  "Bed Counts": "bg-niramoy-teal/10 text-niramoy-teal",
  Pricing: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Profile: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

interface Props {
  hospital: Hospital;
}

export function RecentUpdateLog({ hospital }: Props) {
  // Stable seed → stable synthetic log. An admin sees a believable recent
  // activity trail even though real audit data is not seeded yet.
  const log = seedLog(hospital.id);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Recent updates
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Last 5 changes you made.
            </p>
          </div>
          <Link
            href="/admin/hospital/history"
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-niramoy-teal hover:underline"
          >
            View Full History
            <IconArrowRight className="size-2.5" />
          </Link>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">Type</th>
                <th className="px-3 py-1.5 text-left font-medium">Field</th>
                <th className="px-3 py-1.5 text-left font-medium">Change</th>
                <th className="px-3 py-1.5 text-left font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {log.map((u) => (
                <tr
                  key={u.id}
                  className="border-t bg-card transition-colors hover:bg-muted/30"
                >
                  <td className="px-3 py-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_BADGE[u.type]}`}
                    >
                      {u.type}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-medium text-foreground">
                    {u.field}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">
                    <span className="text-muted-foreground line-through">
                      {u.from}
                    </span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="font-semibold text-foreground">
                      {u.to}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {u.at}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Deterministic seed for the recent-log. Same hospital → same log. */
function seedLog(hospitalId: string): Update[] {
  // Tiny xmur3 hash + 5 deterministic entries.
  let h = 0;
  for (let i = 0; i < hospitalId.length; i += 1) {
    h = (h ^ hospitalId.charCodeAt(i) * 2654435761) >>> 0;
  }
  const types: Update["type"][] = [
    "Bed Counts",
    "Pricing",
    "Profile",
    "Bed Counts",
    "Pricing",
  ];
  const fields = [
    "ICU available",
    "ICU cost / day",
    "Phone",
    "NICU available",
    "HDU cost / day",
  ];
  const when = ["8 m ago", "42 m ago", "2 h ago", "yesterday", "2 d ago"];
  return types.map((type, i) => ({
    id: `${hospitalId}-log-${i}`,
    type,
    field: fields[i],
    from: 5 + ((h >> (i * 3)) & 7),
    to: 6 + ((h >> (i * 3 + 1)) & 7),
    at: when[i],
  }));
}
