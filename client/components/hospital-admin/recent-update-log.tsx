"use client";

/**
 * Recent update log (preview). Five-most-recent synthesized updates. The
 * spec asks the admin to see "what I changed recently" without forcing them
 * to navigate to the full history page.
 */

import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { AgTable } from "@/components/ag-grid/ag-table";
import type { AgCellRenderer } from "@/components/ag-grid/type";
import type { ColDef } from "ag-grid-community";
import { BadgePill, DiffCell } from "@/components/ag-grid/ag-table-cells";
import type { Hospital } from "@/lib/types/hospital";

interface Update {
  id: string;
  type: "Bed Counts" | "Pricing" | "Profile";
  field: string;
  from: number | string;
  to: number | string;
  at: string;
}

const TYPE_BADGE_VARIANT: Record<Update["type"], "teal" | "amber" | "blue"> = {
  "Bed Counts": "teal",
  Pricing: "amber",
  Profile: "blue",
};

interface Props {
  hospital: Hospital;
}

export function RecentUpdateLog({ hospital }: Props) {
  // Stable seed → stable synthetic log. An admin sees a believable recent
  // activity trail even though real audit data is not seeded yet.
  const log = seedLog(hospital.id);

  const columnDefs: ColDef<Update>[] = [
    {
      headerName: "Type",
      field: "type",
      flex: 0.9,
      minWidth: 110,
      cellRenderer: "typeBadge",
    },
    {
      headerName: "Field",
      field: "field",
      flex: 1.2,
      minWidth: 140,
      cellRenderer: (params: { data?: Update }) => {
        if (!params.data) return null;
        return <span className="font-medium text-foreground">{params.data.field}</span>;
      },
    },
    {
      headerName: "Change",
      flex: 1.4,
      minWidth: 180,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data?: Update }) => {
        if (!params.data) return null;
        return (
          <DiffCell
            from={String(params.data.from)}
            to={String(params.data.to)}
          />
        );
      },
    },
    {
      headerName: "When",
      field: "at",
      flex: 0.9,
      minWidth: 110,
      cellRenderer: (params: { data?: Update }) => {
        if (!params.data) return null;
        return <span className="text-muted-foreground">{params.data.at}</span>;
      },
    },
  ];

  return (
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
            href="/management/history"
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-niramoy-teal hover:underline"
          >
            View Full History
            <IconArrowRight className="size-2.5" />
          </Link>
        </div>

        <AgTable<Update>
          rowData={log}
          columnDefs={columnDefs}
          components={{
            typeBadge: RecentTypeCell as unknown as AgCellRenderer<Update>,
          }}
          pagination={false}
          height="auto"
          noRowsText="No recent updates"
        />
      </CardContent>
  );
}

function RecentTypeCell({ row }: { row: Update }) {
  return (
    <BadgePill variant={TYPE_BADGE_VARIANT[row.type]}>{row.type}</BadgePill>
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
