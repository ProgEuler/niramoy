"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconLoader2,
  IconSearch,
  IconShieldCheck,
  IconShieldCog,
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
import type { AdminHospital } from "@/lib/api/admin";

const PAGE_SIZE = 25;

export default function ManageHospitalsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isVerified, setIsVerified] = useState<"all" | "true" | "false">("all");
  const [isActive, setIsActive] = useState<"all" | "true" | "false">("all");
  const [suspendTarget, setSuspendTarget] = useState<AdminHospital | null>(null);

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

  // Debounce search
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
    setPage(1);
  }

  const filtersDirty =
    debouncedSearch !== "" || isVerified !== "all" || isActive !== "all";

  const hospitals = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;
  const totalCount = data?.total_count ?? 0;

  return (
    <>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-48 flex-1">
                <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name or district…"
                  className="h-9 pl-8"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Select
                value={isVerified}
                onValueChange={(v) => { setIsVerified(v as typeof isVerified); setPage(1); }}
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Verification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All verification</SelectItem>
                  <SelectItem value="true">Verified only</SelectItem>
                  <SelectItem value="false">Unverified only</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={isActive}
                onValueChange={(v) => { setIsActive(v as typeof isActive); setPage(1); }}
              >
                <SelectTrigger className="h-9 w-36">
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
            ) : hospitals.length === 0 ? (
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
                        <th className="px-3 py-2 text-left font-medium">Hospital</th>
                        <th className="px-3 py-2 text-left font-medium">Location</th>
                        <th className="px-3 py-2 text-right font-medium">ICU</th>
                        <th className="px-3 py-2 text-right font-medium">NICU</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hospitals.map((h) => (
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
                              #{h.id}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            <div>{h.district}</div>
                            {h.division && (
                              <div className="text-[10px]">{h.division}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            <span className="font-semibold">{h.icu_available}</span>
                            <span className="text-muted-foreground"> / {h.icu_total}</span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            <span className="font-semibold">{h.nicu_available}</span>
                            <span className="text-muted-foreground"> / {h.nicu_total}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-0.5">
                              {h.is_verified ? (
                                <Badge color="teal" icon={<IconShieldCheck className="size-3" />}>
                                  Verified
                                </Badge>
                              ) : (
                                <Badge color="amber" icon={<IconShieldOff className="size-3" />}>
                                  Pending
                                </Badge>
                              )}
                              {!h.is_active && (
                                <Badge color="red" icon={<IconShieldOff className="size-3" />}>
                                  Suspended
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              {!h.is_verified ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-6 gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
                                  disabled={verify.isPending}
                                  onClick={() => verify.mutate({ id: h.id, is_verified: true })}
                                >
                                  <IconCheck className="size-3" />
                                  Verify
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-6 gap-1"
                                  disabled={verify.isPending}
                                  onClick={() => verify.mutate({ id: h.id, is_verified: false })}
                                >
                                  <IconShieldOff className="size-3" />
                                  Unverify
                                </Button>
                              )}
                              {h.is_active ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-6 gap-1 text-destructive hover:bg-destructive/10"
                                  onClick={() => setSuspendTarget(h)}
                                >
                                  Suspend
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-6 gap-1"
                                  disabled={suspend.isPending}
                                  onClick={() =>
                                    suspend.mutate({
                                      id: h.id,
                                      is_suspended: false,
                                      reason: "Reactivated by admin",
                                    })
                                  }
                                >
                                  Reactivate
                                </Button>
                              )}
                              <Button asChild size="sm" variant="ghost" className="h-6 px-1.5">
                                <Link href={`/hospital/${h.id}`}>
                                  <IconArrowRight className="size-3" />
                                </Link>
                              </Button>
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
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <IconChevronLeft className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
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
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {icon}
      {children}
    </span>
  );
}
