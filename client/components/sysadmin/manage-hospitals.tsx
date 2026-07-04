"use client";

/**
 * Page-15 Manage Hospitals (system admin).
 *
 *   - Filterable table: type (public/private/all), division, verified only.
 *   - Search by name / district.
 *   - Row actions: Verify / Suspend, Edit (link to public page), Delete.
 *   - "Add Hospital" CTA → /register-hospital.
 *
 * State is purely client-side for now; row-action toasts surface the
 * underlying intent without performing a destructive real operation.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconBuildingHospital,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconPlus,
  IconSearch,
  IconShieldCheck,
  IconShieldOff,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToasts } from "@/components/ui/toast";
import {
  ALL_DIVISIONS,
  type BangladeshDivision,
  type Hospital,
  type HospitalType,
} from "@/lib/types/hospital";

interface Props {
  hospitals: Hospital[];
}

const PAGE_SIZE = 12;

type Filter = {
  q: string;
  type: HospitalType | "all";
  division: BangladeshDivision | "all";
  verifiedOnly: boolean;
};

const INITIAL: Filter = {
  q: "",
  type: "all",
  division: "all",
  verifiedOnly: false,
};

export function ManageHospitals({ hospitals }: Props) {
  const { pushToast } = useToasts();
  const [filter, setFilter] = useState<Filter>(INITIAL);
  const [page, setPage] = useState(1);
  const [overrides, setOverrides] = useState<Record<string, Partial<Hospital>>>({});

  // Local overrides let toasts succeed on a Set without mutating the source
  // store. Real implementation would call a PATCH endpoint.
  const view = useMemo(() => {
    return hospitals.map((h) => ({ ...h, ...overrides[h.id] }));
  }, [hospitals, overrides]);

  const filtered = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    return view.filter((h) => {
      if (filter.type !== "all" && h.type !== filter.type) return false;
      if (filter.division !== "all" && h.division !== filter.division) return false;
      if (filter.verifiedOnly && !h.verified) return false;
      if (!q) return true;
      return (
        h.name.toLowerCase().includes(q) ||
        h.district.toLowerCase().includes(q) ||
        h.id.toLowerCase().includes(q)
      );
    });
  }, [view, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function updateFilter<K extends keyof Filter>(k: K, v: Filter[K]) {
    setFilter((f) => ({ ...f, [k]: v }));
    setPage(1);
  }

  function resetFilters() {
    setFilter(INITIAL);
    setPage(1);
  }

  function setVerified(h: Hospital, verified: boolean) {
    setOverrides((o) => ({ ...o, [h.id]: { ...o[h.id], verified } }));
    pushToast({
      title: verified ? `${h.name} verified` : `${h.name} suspended`,
      description: verified
        ? "Hospital can now appear in public search."
        : "Hospital is hidden from public search.",
      variant: verified ? "success" : "info",
    });
  }

  function handleDelete(h: Hospital) {
    const ok = window.confirm(`Delete ${h.name}? This cannot be undone.`);
    if (!ok) return;
    setOverrides((o) => ({ ...o, [h.id]: { ...o[h.id], id: h.id } }));
    pushToast({
      title: `${h.name} deleted`,
      variant: "info",
    });
  }

  const filtersDirty =
    filter.q !== "" ||
    filter.type !== "all" ||
    filter.division !== "all" ||
    filter.verifiedOnly;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
                <IconBuildingHospital className="size-4 text-niramoy-teal" />
                Hospital directory
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {filtered.length} of {hospitals.length} hospitals match the
                current filters.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/register-hospital">
                <IconPlus className="size-3.5" />
                Add Hospital
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, district, or ID…"
                className="h-9 pl-8"
                value={filter.q}
                onChange={(e) => updateFilter("q", e.target.value)}
              />
            </div>
            <Select
              value={filter.type}
              onValueChange={(v) => updateFilter("type", v as Filter["type"])}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filter.division}
              onValueChange={(v) =>
                updateFilter("division", v as Filter["division"])
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All divisions</SelectItem>
                {ALL_DIVISIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-card px-3 text-xs text-foreground hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={filter.verifiedOnly}
                  onChange={(e) =>
                    updateFilter("verifiedOnly", e.target.checked)
                  }
                  className="size-3.5 accent-niramoy-teal"
                />
                Verified only
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                disabled={!filtersDirty}
                className="h-9 gap-1.5 text-muted-foreground"
              >
                <IconX className="size-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center text-xs text-muted-foreground">
              <IconFilter className="size-6 opacity-40" />
              <p className="font-medium">No hospitals match these filters</p>
              <p>Try clearing filters or searching by district.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        Hospital
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Location
                      </th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-right font-medium">ICU</th>
                      <th className="px-3 py-2 text-right font-medium">NICU</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Status
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.map((h) => (
                      <tr
                        key={h.id}
                        className="border-t bg-card transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-2">
                          <Link
                            href={`/hospital/${h.id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {h.name}
                          </Link>
                          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {h.id}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <div>{h.district}</div>
                          <div className="text-[10px]">{h.division}</div>
                        </td>
                        <td className="px-3 py-2 capitalize">{h.type}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <span className="font-semibold text-foreground">
                            {h.beds.icu.available}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            / {h.beds.icu.total}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <span className="font-semibold text-foreground">
                            {h.beds.nicu.available}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            / {h.beds.nicu.total}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {h.verified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-niramoy-teal/10 px-2 py-0.5 text-[10px] font-semibold text-niramoy-teal">
                              <IconShieldCheck className="size-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              <IconShieldOff className="size-3" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            {h.verified ? (
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => setVerified(h, false)}
                                className="h-6 gap-1"
                              >
                                <IconShieldOff className="size-3" />
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => setVerified(h, true)}
                                className="h-6 gap-1"
                              >
                                <IconCheck className="size-3" />
                                Verify
                              </Button>
                            )}
                            <Link
                              href={`/hospital/${h.id}`}
                              className="inline-flex h-6 items-center gap-1 rounded-md border bg-card px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/40"
                            >
                              View
                              <IconArrowRight className="size-3" />
                            </Link>
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleDelete(h)}
                              aria-label={`Delete ${h.name}`}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <IconTrash className="size-3" />
                            </Button>
                          </div>
                        </td>
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
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
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