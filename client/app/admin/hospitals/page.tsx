"use client";

/**
 * PAGE 2 — Hospitals master list (system admin).
 *
 * Filterable, sortable, paginated table of every hospital on the platform.
 * Per-row actions: View (slide-out panel), Edit, Verify/Unverify, Suspend,
 * Delete. Top-right "+ Add Hospital" button. The View panel shows the full
 * hospital record without leaving the list.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconArrowDown,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconFilter,
  IconLoader2,
  IconPencil,
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
import {
  useAdminHospitals,
  useDeleteHospital,
  useSuspendHospital,
  useVerifyHospital,
} from "@/lib/hooks/use-admin";
import { SuspendDialog } from "@/components/sysadmin/suspend-dialog";
import { useToasts } from "@/components/ui/toast";
import { ALL_DIVISIONS } from "@/lib/types/hospital";
import { formatRelativeTime } from "@/lib/hospital-utils";
import type { AdminHospital } from "@/lib/api/admin";

const PAGE_SIZE = 25;

type SortKey = "name" | "district" | "verified" | "last_updated";
type SortDir = "asc" | "desc";

export default function ManageHospitalsPage() {
  const { pushToast } = useToasts();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isVerified, setIsVerified] = useState<"all" | "true" | "false">("all");
  const [isActive, setIsActive] = useState<"all" | "true" | "false">("all");
  const [division, setDivision] = useState<string>("all");
  const [district, setDistrict] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("last_updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewTarget, setViewTarget] = useState<AdminHospital | null>(null);
  const [editTarget, setEditTarget] = useState<AdminHospital | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminHospital | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, isFetching } = useAdminHospitals({
    page,
    page_size: PAGE_SIZE,
    search: debouncedSearch || undefined,
    is_verified: isVerified === "all" ? undefined : isVerified === "true",
    is_active: isActive === "all" ? undefined : isActive === "true",
  });

  const verify = useVerifyHospital();
  const suspend = useSuspendHospital();
  const del = useDeleteHospital();

  const hospitals = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;
  const totalCount = data?.total_count ?? 0;

  // District list derived from the visible (search-filtered) hospitals for
  // the division/district filter — keeps the dropdown honest without a
  // separate reference-data endpoint.
  const districtsForDivision = useMemo(() => {
    if (division === "all") return [];
    return Array.from(
      new Set(
        hospitals
          .filter((h) => h.division === division)
          .map((h) => h.district)
          .filter(Boolean),
      ),
    ).sort();
  }, [hospitals, division]);

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout((handleSearch as unknown as { _t?: number })._t);
    (handleSearch as unknown as { _t?: number })._t = window.setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  }

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setIsVerified("all");
    setIsActive("all");
    setDivision("all");
    setDistrict("all");
    setPage(1);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtersDirty =
    debouncedSearch !== "" ||
    isVerified !== "all" ||
    isActive !== "all" ||
    division !== "all" ||
    district !== "all";

  // Client-side sort over the page slice.
  const sortedHospitals = useMemo(() => {
    const cmp = (a: AdminHospital, b: AdminHospital): number => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "district":
          return a.district.localeCompare(b.district);
        case "verified":
          return Number(a.is_verified) - Number(b.is_verified);
        case "last_updated":
          return (a.last_updated ?? "").localeCompare(b.last_updated ?? "");
      }
    };
    const out = [...hospitals].sort(cmp);
    return sortDir === "desc" ? out.reverse() : out;
  }, [hospitals, sortKey, sortDir]);

  return (
    <>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Header row with Add Hospital button */}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Hospitals
            </h1>
            <p className="text-xs text-muted-foreground">
              {totalCount} hospital{totalCount !== 1 ? "s" : ""} on the
              platform.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
            onClick={() => setShowAdd(true)}
          >
            <IconPlus className="size-3.5" />
            Add Hospital
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-48 flex-1">
                <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search hospital name…"
                  className="h-9 pl-8"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Select
                value={division}
                onValueChange={(v) => {
                  setDivision(v);
                  setDistrict("all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-40">
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
              <Select
                value={district}
                onValueChange={(v) => {
                  setDistrict(v);
                  setPage(1);
                }}
                disabled={division === "all"}
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All districts</SelectItem>
                  {districtsForDivision.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={isVerified}
                onValueChange={(v) => {
                  setIsVerified(v as typeof isVerified);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue placeholder="Verified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All verification</SelectItem>
                  <SelectItem value="true">Verified only</SelectItem>
                  <SelectItem value="false">Unverified only</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={isActive}
                onValueChange={(v) => {
                  setIsActive(v as typeof isActive);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Suspended</SelectItem>
                </SelectContent>
              </Select>
              {filtersDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 text-muted-foreground"
                  onClick={resetFilters}
                >
                  <IconX className="size-3.5" />
                  Clear
                </Button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {isFetching && !isLoading
                ? "Refreshing…"
                : `${totalCount} hospital${totalCount !== 1 ? "s" : ""} found`}
            </p>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
                <IconLoader2 className="size-4 animate-spin" />
                Loading…
              </div>
            ) : sortedHospitals.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-16 text-center text-xs text-muted-foreground">
                <IconFilter className="size-6 opacity-40" />
                <p className="font-medium">No hospitals match these filters</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <SortHeader
                          label="Hospital"
                          active={sortKey === "name"}
                          dir={sortDir}
                          onClick={() => toggleSort("name")}
                        />
                        <SortHeader
                          label="District"
                          active={sortKey === "district"}
                          dir={sortDir}
                          onClick={() => toggleSort("district")}
                        />
                        <SortHeader
                          label="Verified"
                          active={sortKey === "verified"}
                          dir={sortDir}
                          onClick={() => toggleSort("verified")}
                        />
                        <SortHeader
                          label="Last updated"
                          active={sortKey === "last_updated"}
                          dir={sortDir}
                          onClick={() => toggleSort("last_updated")}
                        />
                        <th className="px-3 py-2 text-left font-medium">Admin</th>
                        <th className="px-3 py-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHospitals.map((h) => (
                        <tr
                          key={h.id}
                          className="border-t bg-card transition-colors hover:bg-muted/30"
                        >
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setViewTarget(h)}
                              className="font-medium text-foreground hover:underline"
                            >
                              {h.name}
                            </button>
                            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                              #{h.id}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            <div>{h.district}</div>
                            {h.division && (
                              <div className="text-[10px]">{h.division}</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              color={h.is_verified ? "teal" : "amber"}
                              icon={
                                h.is_verified ? (
                                  <IconShieldCheck className="size-3" />
                                ) : (
                                  <IconShieldOff className="size-3" />
                                )
                              }
                            >
                              {h.is_verified ? "Verified" : "Pending"}
                            </Badge>
                            {!h.is_active && (
                              <div className="mt-0.5">
                                <Badge color="red" icon={<IconShieldOff className="size-3" />}>
                                  Suspended
                                </Badge>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground tabular-nums">
                            {h.last_updated ? formatRelativeTime(h.last_updated) : "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {/* Hooked up to /admin/users in production. */}
                            <span className="text-[10px]">Hospital Admin</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-1.5"
                                onClick={() => setViewTarget(h)}
                                title="View"
                              >
                                <IconArrowRight className="size-3" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-1.5"
                                onClick={() => setEditTarget(h)}
                                title="Edit"
                              >
                                <IconPencil className="size-3" />
                              </Button>
                              {h.is_verified ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5"
                                  disabled={verify.isPending}
                                  onClick={() =>
                                    verify.mutate({ id: h.id, is_verified: false })
                                  }
                                  title="Unverify"
                                >
                                  <IconShieldOff className="size-3" />
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-6 gap-1 bg-niramoy-teal px-2 text-white hover:bg-niramoy-teal/90"
                                  disabled={verify.isPending}
                                  onClick={() =>
                                    verify.mutate({ id: h.id, is_verified: true })
                                  }
                                >
                                  <IconCheck className="size-3" />
                                </Button>
                              )}
                              {h.is_active ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-destructive hover:bg-destructive/10"
                                  onClick={() => setSuspendTarget(h)}
                                  title="Suspend"
                                >
                                  <IconShieldOff className="size-3" />
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5"
                                  disabled={suspend.isPending}
                                  onClick={() =>
                                    suspend.mutate({
                                      id: h.id,
                                      is_suspended: false,
                                      reason: "Reactivated by admin",
                                    })
                                  }
                                  title="Reactivate"
                                >
                                  <IconCheck className="size-3" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-1.5 text-destructive hover:bg-destructive/10"
                                disabled={del.isPending}
                                onClick={() => {
                                  if (confirm(`Delete "${h.name}"? This cannot be undone.`)) {
                                    del.mutate(h.id);
                                  }
                                }}
                                title="Delete"
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

                {/* Pagination */}
                <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-[11px] text-muted-foreground">
                  <span>
                    Page{" "}
                    <span className="font-medium text-foreground">{page}</span> of{" "}
                    <span className="font-medium text-foreground">{totalPages}</span>
                    {" · "}
                    <span className="font-medium text-foreground">{totalCount}</span> total
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      aria-label="Previous page"
                    >
                      <IconChevronLeft className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      aria-label="Next page"
                    >
                      <IconChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Side panel: view / edit */}
      {viewTarget && (
        <HospitalSidePanel
          hospital={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={() => {
            setEditTarget(viewTarget);
            setViewTarget(null);
          }}
          onVerify={() => verify.mutate({ id: viewTarget.id, is_verified: !viewTarget.is_verified })}
          onSuspend={() => {
            setSuspendTarget(viewTarget);
            setViewTarget(null);
          }}
        />
      )}
      {editTarget && (
        <EditHospitalDialog
          hospital={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            pushToast({ title: "Hospital updated", variant: "success" });
            setEditTarget(null);
          }}
        />
      )}
      {showAdd && (
        <AddHospitalDialog
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            pushToast({ title: "Hospital added", variant: "success" });
            setShowAdd(false);
          }}
        />
      )}
      {suspendTarget && (
        <SuspendDialog
          title={`Suspend "${suspendTarget.name}"?`}
          description="The hospital will be hidden from public search and the admin's login will be disabled."
          confirmLabel="Suspend hospital"
          onCancel={() => setSuspendTarget(null)}
          onConfirm={(reason) => {
            suspend.mutate(
              { id: suspendTarget.id, is_suspended: true, reason },
              { onSuccess: () => setSuspendTarget(null) },
            );
          }}
          loading={suspend.isPending}
        />
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function Badge({
  children,
  color,
  icon,
}: {
  children: React.ReactNode;
  color: "teal" | "amber" | "red";
  icon?: React.ReactNode;
}) {
  const cls =
    color === "teal"
      ? "bg-niramoy-teal/10 text-niramoy-teal"
      : color === "amber"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "bg-destructive/10 text-destructive";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {icon}
      {children}
    </span>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="px-3 py-2 text-left font-medium">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-0.5 transition-colors hover:text-foreground ${
          active ? "text-foreground" : ""
        }`}
      >
        {label}
        {active &&
          (dir === "asc" ? (
            <IconArrowUp className="size-2.5" />
          ) : (
            <IconArrowDown className="size-2.5" />
          ))}
      </button>
    </th>
  );
}

function HospitalSidePanel({
  hospital,
  onClose,
  onEdit,
  onVerify,
  onSuspend,
}: {
  hospital: AdminHospital;
  onClose: () => void;
  onEdit: () => void;
  onVerify: () => void;
  onSuspend: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/40 backdrop-blur-sm">
      <button
        type="button"
        className="flex-1"
        onClick={onClose}
        aria-label="Close panel"
      />
      <div className="flex h-full w-full max-w-md flex-col border-l bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-heading text-sm font-semibold">
              {hospital.name}
            </h2>
            <p className="text-[10px] text-muted-foreground">
              #{hospital.id} · {hospital.district}
              {hospital.division ? `, ${hospital.division}` : ""}
            </p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX className="size-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
          <PanelSection title="Contact">
            <p className="text-muted-foreground">{hospital.address}</p>
            {hospital.phone_emergency && (
              <p className="mt-1">
                <span className="text-[10px] text-muted-foreground">
                  Emergency:
                </span>{" "}
                <a
                  href={`tel:${hospital.phone_emergency}`}
                  className="text-niramoy-teal hover:underline"
                >
                  {hospital.phone_emergency}
                </a>
              </p>
            )}
            {hospital.phone_general && (
              <p>
                <span className="text-[10px] text-muted-foreground">
                  General:
                </span>{" "}
                <a
                  href={`tel:${hospital.phone_general}`}
                  className="text-niramoy-teal hover:underline"
                >
                  {hospital.phone_general}
                </a>
              </p>
            )}
          </PanelSection>

          <PanelSection title="Current bed counts">
            <div className="grid grid-cols-4 gap-2 rounded-md border bg-muted/30 p-2 text-center">
              <BedMini label="ICU" total={hospital.icu_total} available={hospital.icu_available} />
              <BedMini label="NICU" total={hospital.nicu_total} available={hospital.nicu_available} />
              <BedMini label="CCU" total={hospital.ccu_total} available={hospital.ccu_available} />
              <BedMini label="HDU" total={hospital.hdu_total} available={hospital.hdu_available} />
            </div>
          </PanelSection>

          <PanelSection title="Linked admin">
            <p className="text-muted-foreground">
              Hospital Admin account (linked via /admin/users)
            </p>
          </PanelSection>

          <PanelSection title="Last 5 updates">
            <p className="text-[11px] text-muted-foreground">
              Open the moderation queue to inspect the last 5 updates from this
              hospital.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2 h-7 gap-1">
              <Link href={`/admin/updates?hospital_id=${hospital.id}`}>
                View updates
                <IconArrowRight className="size-3" />
              </Link>
            </Button>
          </PanelSection>

          <PanelSection title="Quick actions">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
                onClick={onVerify}
              >
                <IconShieldCheck className="size-3" />
                {hospital.is_verified ? "Unverify" : "Verify"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1"
                onClick={onSuspend}
              >
                <IconShieldOff className="size-3" />
                {hospital.is_active ? "Suspend" : "Reactivate"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1"
                onClick={onEdit}
              >
                <IconPencil className="size-3" />
                Edit
              </Button>
              <Button asChild size="sm" variant="ghost" className="h-7 gap-1">
                <Link href={`/hospital/${hospital.id}`} target="_blank">
                  <IconExternalLink className="size-3" />
                  View public page
                </Link>
              </Button>
            </div>
          </PanelSection>
        </div>
      </div>
    </div>
  );
}

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1 rounded-md border bg-background p-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function BedMini({
  label,
  total,
  available,
}: {
  label: string;
  total: number;
  available: number;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-heading text-base font-bold tabular-nums text-foreground">
        {available}
      </div>
      <div className="text-[10px] text-muted-foreground tabular-nums">
        of {total}
      </div>
    </div>
  );
}

function EditHospitalDialog({
  hospital,
  onClose,
  onSaved,
}: {
  hospital: AdminHospital;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(hospital.name);
  const [address, setAddress] = useState(hospital.address);
  const [phoneEmergency, setPhoneEmergency] = useState(hospital.phone_emergency ?? "");
  const [phoneGeneral, setPhoneGeneral] = useState(hospital.phone_general ?? "");
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    // Stand-in for PUT /api/admin/hospitals/{id}. Real impl wires updateHospital.
    setTimeout(() => {
      setSaving(false);
      onSaved();
    }, 400);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-3 rounded-t-lg border bg-card p-5 shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 font-heading text-sm font-semibold">
              <IconPencil className="size-4 text-niramoy-teal" />
              Edit hospital
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              #{hospital.id} · {hospital.district}
            </p>
          </div>
          <Button type="button" size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close">
            <IconX className="size-4" />
          </Button>
        </div>

        <Field label="Name">
          <Input className="h-9" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Address">
          <Input className="h-9" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Emergency phone">
            <Input
              className="h-9"
              value={phoneEmergency}
              onChange={(e) => setPhoneEmergency(e.target.value)}
            />
          </Field>
          <Field label="General phone">
            <Input
              className="h-9"
              value={phoneGeneral}
              onChange={(e) => setPhoneGeneral(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="h-8 gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
          >
            {saving ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconArrowLeft className="size-3.5 -scale-x-100" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddHospitalDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [saving, setSaving] = useState(false);

  function handleCreate() {
    if (!name.trim() || !district.trim()) return;
    setSaving(true);
    // Stand-in for POST /api/admin/hospitals (used to seed OSM data manually).
    setTimeout(() => {
      setSaving(false);
      onCreated();
    }, 400);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-3 rounded-t-lg border bg-card p-5 shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 font-heading text-sm font-semibold">
              <IconPlus className="size-4 text-niramoy-teal" />
              Add hospital
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Use this when importing OSM seed data manually.
            </p>
          </div>
          <Button type="button" size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close">
            <IconX className="size-4" />
          </Button>
        </div>

        <Field label="Hospital name">
          <Input
            className="h-9"
            placeholder="e.g. Dhaka Medical College Hospital"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="District">
          <Input
            className="h-9"
            placeholder="e.g. Dhaka"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Division">
            <Select defaultValue="Dhaka">
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_DIVISIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Hospital type">
            <Select defaultValue="public">
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!name.trim() || !district.trim() || saving}
            onClick={handleCreate}
            className="h-8 gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
          >
            {saving ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconPlus className="size-3.5" />}
            Create hospital
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}