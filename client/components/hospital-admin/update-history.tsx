"use client";

/**
 * Page-13 Update History / Audit Log.
 *
 * A paginated, filterable table of every change this hospital has made:
 *   - Type (Bed Counts, Pricing, Profile)
 *   - Field (e.g. "ICU available")
 *   - From → To values (diff)
 *   - When (timestamp + relative)
 *   - Who (admin)
 *
 * Filters:
 *   - Date range (from / to) — inclusive of the day
 *   - Type — multi-select chips
 *
 * CSV export is provided by `<AgTable>`'s built-in cell-click → date-range
 * dialog (no hand-rolled exporter needed).
 *
 * Synthetic data is deterministic per hospital id (xmur3 hash + mulberry32
 * PRNG) so the audit trail looks believable without a backend.
 */

import { useMemo, useState } from "react";
import {
  IconCalendar,
  IconClipboardList,
  IconFilter,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AgTable } from "@/components/ag-grid/ag-table";
import type { AgCellRenderer } from "@/components/ag-grid/type";
import type { ColDef } from "ag-grid-community";
import {
  BadgePill,
  DiffCell,
  WhenCell,
} from "@/components/ag-grid/ag-table-cells";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  hospital: Hospital;
}

interface AuditEntry {
  id: string;
  type: "Bed Counts" | "Pricing" | "Profile";
  field: string;
  from: string;
  to: string;
  /** ISO timestamp. */
  at: string;
  by: string;
}

const TYPES = ["Bed Counts", "Pricing", "Profile"] as const;
type AuditType = (typeof TYPES)[number];

const PAGE_SIZE = 10;

const TYPE_BADGE_VARIANT: Record<AuditType, "teal" | "amber" | "blue"> = {
  "Bed Counts": "teal",
  Pricing: "amber",
  Profile: "blue",
};

export function UpdateHistory({ hospital }: Props) {
  const entries = useMemo(() => seedAudit(hospital.id), [hospital.id]);

  // Filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<AuditType>>(
    () => new Set(AuditTypes()),
  );

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : Infinity;
    return entries.filter((e) => {
      if (!activeTypes.has(e.type)) return false;
      const t = new Date(e.at).getTime();
      if (t < fromTs || t > toTs) return false;
      return true;
    });
  }, [entries, from, to, activeTypes]);

  function toggleType(t: AuditType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        if (next.size === 1) return prev; // never empty
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  }

  function clearFilters() {
    setFrom("");
    setTo("");
    setActiveTypes(new Set(AuditTypes()));
  }

  const filtersDirty =
    from !== "" || to !== "" || activeTypes.size !== AuditTypes().length;

  const columnDefs: ColDef<AuditEntry>[] = [
    {
      headerName: "Type",
      field: "type",
      flex: 0.9,
      minWidth: 110,
      cellRenderer: "auditType",
    },
    {
      headerName: "Field",
      field: "field",
      flex: 1.2,
      minWidth: 160,
      cellRenderer: (params: { data?: AuditEntry }) => {
        if (!params.data) return null;
        return <span className="font-medium text-foreground">{params.data.field}</span>;
      },
    },
    {
      headerName: "Change",
      flex: 1.5,
      minWidth: 220,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data?: AuditEntry }) => {
        if (!params.data) return null;
        return <DiffCell from={params.data.from} to={params.data.to} />;
      },
    },
    {
      headerName: "When",
      field: "at",
      flex: 1.4,
      minWidth: 180,
      cellRenderer: "when",
    },
    {
      headerName: "By",
      field: "by",
      flex: 0.8,
      minWidth: 120,
      cellRenderer: (params: { data?: AuditEntry }) => {
        if (!params.data) return null;
        return <span className="text-muted-foreground">{params.data.by}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
                <IconClipboardList className="size-4 text-niramoy-teal" />
                Audit log
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Every change made to this hospital, in reverse chronological
                order. Click any cell to export a date-range CSV.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <DateField
              id="from"
              label="From"
              value={from}
              onChange={setFrom}
            />
            <DateField
              id="to"
              label="To"
              value={to}
              onChange={setTo}
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={!filtersDirty}
                className="h-9 w-full gap-1.5 text-muted-foreground sm:w-auto"
              >
                <IconX className="size-3.5" />
                Reset filters
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <IconFilter className="size-3" />
              Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => {
                const on = activeTypes.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      on
                        ? "bg-niramoy-teal text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <AgTable<AuditEntry>
            rowData={filtered}
            columnDefs={columnDefs}
            components={{
              auditType: AuditTypeCell as unknown as AgCellRenderer<AuditEntry>,
              when: WhenCell as unknown as AgCellRenderer<AuditEntry>,
            }}
            pagination
            pageSize={PAGE_SIZE}
            height="auto"
            noRowsText="No matching changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function AuditTypeCell({ row }: { row: AuditEntry }) {
  return (
    <BadgePill variant={TYPE_BADGE_VARIANT[row.type]}>{row.type}</BadgePill>
  );
}

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        <IconCalendar className="size-3" />
        {label}
      </label>
      <Input
        id={id}
        type="date"
        className="h-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ---------- synthetic data ----------

function AuditTypes(): AuditType[] {
  return ["Bed Counts", "Pricing", "Profile"];
}

/** Stable hash → PRNG. Same hospital id → same audit log. */
function makeRng(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h ^ seed.charCodeAt(i) * 2654435761) >>> 0;
  }
  // mulberry32
  return function rng() {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedAudit(hospitalId: string): AuditEntry[] {
  const rng = makeRng(hospitalId);
  const types: AuditType[] = ["Bed Counts", "Pricing", "Profile"];
  const fields: Record<AuditType, string[]> = {
    "Bed Counts": [
      "ICU available",
      "ICU total capacity",
      "NICU available",
      "NICU total capacity",
      "CCU available",
      "CCU total capacity",
      "HDU available",
      "HDU total capacity",
    ],
    Pricing: [
      "ICU cost / day",
      "NICU cost / day",
      "CCU cost / day",
      "HDU cost / day",
    ],
    Profile: ["Phone", "Address", "Photo", "About", "Pin location"],
  };
  const admins = ["Admin", "Dr. Karim", "Sumaiya R."];

  // Generate 64 entries spread over the last ~30 days.
  const now = Date.now();
  const entries: AuditEntry[] = [];
  for (let i = 0; i < 64; i += 1) {
    const t = types[Math.floor(rng() * types.length)];
    const field = fields[t][Math.floor(rng() * fields[t].length)];
    const minutesAgo = Math.floor(rng() * 60 * 24 * 30); // 0–30d
    const at = new Date(now - minutesAgo * 60_000).toISOString();
    const { from, to } = synthesizeDiff(t, field, rng);
    entries.push({
      id: `${hospitalId}-audit-${i}`,
      type: t,
      field,
      from,
      to,
      at,
      by: admins[Math.floor(rng() * admins.length)],
    });
  }
  // Newest first.
  entries.sort((a, b) => (a.at < b.at ? 1 : -1));
  return entries;
}

function synthesizeDiff(
  type: AuditType,
  field: string,
  rng: () => number,
): { from: string; to: string } {
  if (type === "Bed Counts") {
    const from = Math.floor(rng() * 12);
    const to = Math.max(0, from + Math.floor(rng() * 7) - 3);
    return { from: String(from), to: String(to) };
  }
  if (type === "Pricing") {
    const from = 3000 + Math.floor(rng() * 7000);
    const to = Math.max(0, from + Math.floor(rng() * 4000) - 2000);
    return { from: `৳${from}`, to: `৳${to}` };
  }
  // Profile
  if (field === "Phone") {
    const from = "+8801711550000";
    const to = "+8801711660000";
    return { from, to };
  }
  if (field === "Pin location") {
    const from = "23.7800, 90.4000";
    const to = "23.7812, 90.4016";
    return { from, to };
  }
  if (field === "Photo") {
    return { from: "cover-v1.jpg", to: "cover-v2.jpg" };
  }
  if (field === "Address") {
    return { from: "12 Old Rd", to: "12/C New Ave" };
  }
  return { from: "—", to: "Updated" };
}