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
 * Actions:
 *   - Export CSV (filtered rows)
 *   - Page through 10 rows at a time
 *
 * Synthetic data is deterministic per hospital id (xmur3 hash + mulberry32
 * PRNG) so the audit trail looks believable without a backend.
 */

import { useMemo, useState } from "react";
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardList,
  IconDownload,
  IconFilter,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToasts } from "@/components/ui/toast";
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

const TYPE_BADGE: Record<AuditType, string> = {
  "Bed Counts": "bg-niramoy-teal/10 text-niramoy-teal",
  Pricing: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Profile: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

export function UpdateHistory({ hospital }: Props) {
  const { pushToast } = useToasts();
  const entries = useMemo(() => seedAudit(hospital.id), [hospital.id]);

  // Filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<AuditType>>(
    () => new Set(AuditTypes()),
  );

  // Pagination
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function toggleType(t: AuditType) {
    setPage(1);
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
    setPage(1);
  }

  function handleExport() {
    if (filtered.length === 0) {
      pushToast({
        title: "Nothing to export",
        description: "No rows match the current filters.",
        variant: "info",
      });
      return;
    }
    const header = ["Type", "Field", "From", "To", "When (ISO)", "Who"];
    const rows = filtered.map((e) =>
      [
        e.type,
        e.field,
        `"${e.from.replace(/"/g, '""')}"`,
        `"${e.to.replace(/"/g, '""')}"`,
        e.at,
        e.by,
      ].join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${hospital.id}-audit-log.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    pushToast({
      title: "Audit log exported",
      description: `${filtered.length} rows written to CSV.`,
      variant: "success",
    });
  }

  const filtersDirty =
    from !== "" ||
    to !== "" ||
    activeTypes.size !== AuditTypes().length;

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
                order. Use the filters to narrow it down, or export a CSV.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8 gap-1.5"
            >
              <IconDownload className="size-3.5" />
              Export CSV
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <DateField
              id="from"
              label="From"
              value={from}
              onChange={(v) => {
                setFrom(v);
                setPage(1);
              }}
            />
            <DateField
              id="to"
              label="To"
              value={to}
              onChange={(v) => {
                setTo(v);
                setPage(1);
              }}
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
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center text-xs text-muted-foreground">
              <IconClipboardList className="size-6 opacity-40" />
              <p className="font-medium">No matching changes</p>
              <p>Try widening the date range or re-enabling a type.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Field</th>
                      <th className="px-3 py-2 text-left font-medium">Change</th>
                      <th className="px-3 py-2 text-left font-medium">When</th>
                      <th className="px-3 py-2 text-left font-medium">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.map((e) => (
                      <tr
                        key={e.id}
                        className="border-t bg-card transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_BADGE[e.type]}`}
                          >
                            {e.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-foreground">
                          {e.field}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          <span className="text-muted-foreground line-through">
                            {e.from}
                          </span>
                          <span className="mx-1 text-muted-foreground">→</span>
                          <span className="font-semibold text-foreground">
                            {e.to}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <span className="tabular-nums">{formatDateTime(e.at)}</span>
                          <span className="ml-1 text-[10px]">
                            ({relativeFromNow(e.at)})
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{e.by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={safePage}
                totalPages={totalPages}
                onChange={setPage}
                total={filtered.length}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
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

function Pagination({
  page,
  totalPages,
  onChange,
  total,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  total: number;
}) {
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-[11px] text-muted-foreground">
      <span>
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <IconChevronLeft className="size-3.5" />
        </Button>
        <span className="px-2 tabular-nums">
          Page <span className="font-medium text-foreground">{page}</span> / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <IconChevronRight className="size-3.5" />
        </Button>
      </div>
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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  // YYYY-MM-DD HH:mm in local time
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function relativeFromNow(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}