"use client";

import { useState } from "react";
import {
  IconArrowLeft,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconLock,
  IconPlus,
  IconSearch,
  IconShieldCog,
  IconTrash,
  IconUserOff,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
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
  useAdminUsers,
  useCreateAdminUser,
  useDeleteUser,
  useResetUserPassword,
  useSuspendUser,
} from "@/lib/hooks/use-admin";
import { SuspendDialog } from "@/components/sysadmin/suspend-dialog";
import { CreateAdminUserDialog } from "@/components/sysadmin/create-admin-user-dialog";
import type { AdminUser } from "@/lib/api/admin";
import type { UserRole } from "@/lib/api/auth";

const PAGE_SIZE = 25;

const ROLE_LABELS: Record<UserRole, string> = {
  patient: "Patient",
  hospital_admin: "Hospital Admin",
  system_admin: "System Admin",
};

const ROLE_BADGE: Record<UserRole, string> = {
  patient: "bg-muted text-muted-foreground",
  hospital_admin: "bg-niramoy-teal/10 text-niramoy-teal",
  system_admin: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export default function ManageUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data, isLoading, isFetching } = useAdminUsers({
    page,
    page_size: PAGE_SIZE,
    search: debouncedSearch || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
    is_active:
      statusFilter === "all" ? undefined : statusFilter === "active",
  });

  const suspend = useSuspendUser();
  const resetPw = useResetUserPassword();
  const del = useDeleteUser();
  const createAdmin = useCreateAdminUser();

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
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  }

  const filtersDirty =
    debouncedSearch !== "" || roleFilter !== "all" || statusFilter !== "all";
  const users = data?.data ?? [];
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
                  placeholder="Search username or email…"
                  className="h-9 pl-8"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(v) => { setRoleFilter(v as typeof roleFilter); setPage(1); }}
              >
                <SelectTrigger className="h-9 w-44">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="hospital_admin">Hospital Admin</SelectItem>
                  <SelectItem value="system_admin">System Admin</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
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
                : `${totalCount} user${totalCount !== 1 ? "s" : ""} found`}
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
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-16 text-center text-xs text-muted-foreground">
                <IconUsers className="size-6 opacity-40" />
                <p className="font-medium">No users match these filters</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">User</th>
                        <th className="px-3 py-2 text-left font-medium">Role</th>
                        <th className="px-3 py-2 text-left font-medium">Hospital</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-left font-medium">Last login</th>
                        <th className="px-3 py-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.id}
                          className="border-t bg-card transition-colors hover:bg-muted/30"
                        >
                          <td className="px-3 py-2">
                            <div className="font-medium text-foreground">{u.username}</div>
                            <div className="text-[10px] text-muted-foreground">{u.email}</div>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE[u.role]}`}
                            >
                              {ROLE_LABELS[u.role]}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {u.hospital_id ? (
                              <Link
                                href={`/hospital/${u.hospital_id}`}
                                className="text-niramoy-teal hover:underline"
                              >
                                #{u.hospital_id}
                              </Link>
                            ) : (
                              <span className="text-[10px]">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                <IconCheck className="size-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                                <IconUserOff className="size-3" />
                                Suspended
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground tabular-nums">
                            {u.last_login
                              ? new Date(u.last_login).toLocaleDateString()
                              : "Never"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              {u.is_active ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-6 gap-1 text-destructive hover:bg-destructive/10"
                                  onClick={() => setSuspendTarget(u)}
                                >
                                  <IconUserOff className="size-3" />
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
                                      id: u.id,
                                      is_suspended: false,
                                      reason: "Reactivated by admin",
                                    })
                                  }
                                >
                                  Reactivate
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-6 gap-1"
                                disabled={resetPw.isPending}
                                title="Send password reset email"
                                onClick={() => resetPw.mutate(u.id)}
                              >
                                <IconLock className="size-3" />
                                Reset pw
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-1.5 text-destructive hover:bg-destructive/10"
                                disabled={del.isPending}
                                onClick={() => {
                                  if (confirm(`Delete user "${u.username}"?`)) {
                                    del.mutate(u.id);
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
                <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-[11px] text-muted-foreground">
                  <span>
                    Page <span className="font-medium text-foreground">{page}</span> of{" "}
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
          title={`Suspend "${suspendTarget.username}"?`}
          description="The user will not be able to log in until reactivated."
          confirmLabel="Suspend user"
          onCancel={() => setSuspendTarget(null)}
          onConfirm={(reason) =>
            suspend.mutate(
              { id: suspendTarget.id, is_suspended: true, reason },
              { onSuccess: () => setSuspendTarget(null) },
            )
          }
          loading={suspend.isPending}
        />
      )}

      {showCreateDialog && (
        <CreateAdminUserDialog
          onCancel={() => setShowCreateDialog(false)}
          onConfirm={(payload) =>
            createAdmin.mutate(payload, {
              onSuccess: () => setShowCreateDialog(false),
            })
          }
          loading={createAdmin.isPending}
          error={createAdmin.error?.detail}
        />
      )}
    </>
  );
}
