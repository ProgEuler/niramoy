"use client"

/**
 * PAGE 3 — Users master list (system admin).
 *
 * Filterable, server-paginated table of every user account. Actions: Suspend
 * (modal), Reset password, View linked hospital, Delete. Top-right "Create
 * System Admin" button.
 *
 * Rendered through `<AgTable>`. No row-click navigation — actions live in
 * the pinned-right actions cell.
 */

import { useState } from "react"
import Link from "next/link"
import {
  IconBuildingHospital,
  IconLoader2,
  IconLock,
  IconPlus,
  IconSearch,
  IconShieldOff,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AgTable } from "@/components/ag-grid/ag-table"
import type { AgCellRenderer } from "@/components/ag-grid/type"
import type { ColDef } from "ag-grid-community"
import {
  HospitalLinkCell,
  RoleBadgeCell,
  StatusBadgeCell,
  UserCell,
} from "@/components/ag-grid/ag-table-cells"
import {
  useAdminUsers,
  useCreateAdminUser,
  useDeleteUser,
  useResetUserPassword,
  useSuspendUser,
} from "@/lib/hooks/use-admin"
import { SuspendDialog } from "@/components/sysadmin/suspend-dialog"
import { CreateAdminUserDialog } from "@/components/sysadmin/create-admin-user-dialog"
import type { AdminUser } from "@/lib/api/admin"
import type { UserRole } from "@/lib/api/auth"

const PAGE_SIZE = 25

export default function ManageUsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "suspended"
  >("all")
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data, isLoading, isFetching } = useAdminUsers({
    page,
    page_size: PAGE_SIZE,
    search: debouncedSearch || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
    is_active: statusFilter === "all" ? undefined : statusFilter === "active",
  })

  const suspend = useSuspendUser()
  const resetPw = useResetUserPassword()
  const del = useDeleteUser()
  const createAdmin = useCreateAdminUser()

  function handleSearch(val: string) {
    setSearch(val)
    clearTimeout((handleSearch as unknown as { _t?: number })._t)
    ;(handleSearch as unknown as { _t?: number })._t = window.setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 350)
  }

  function resetFilters() {
    setSearch("")
    setDebouncedSearch("")
    setRoleFilter("all")
    setStatusFilter("all")
    setPage(1)
  }

  const filtersDirty =
    debouncedSearch !== "" || roleFilter !== "all" || statusFilter !== "all"
  const users = data?.data ?? []
  const totalCount = data?.total_count ?? 0

  const columnDefs: ColDef<AdminUser>[] = [
    {
      headerName: "User",
      field: "username",
      flex: 2,
      minWidth: 220,
      cellRenderer: "userCell",
    },
    {
      headerName: "Role",
      field: "role",
      flex: 1,
      minWidth: 130,
      cellRenderer: "roleBadge",
    },
    {
      headerName: "Hospital",
      field: "hospital_id",
      flex: 1,
      minWidth: 110,
      sortable: false,
      filter: false,
      cellRenderer: "hospitalLink",
    },
    {
      headerName: "Registered",
      field: "created_at",
      flex: 1,
      minWidth: 130,
      cellRenderer: "dateFromRow",
      cellRendererParams: { field: "created_at", fallback: "—" },
    },
    {
      headerName: "Last login",
      field: "last_login",
      flex: 1,
      minWidth: 130,
      cellRenderer: "dateFromRow",
      cellRendererParams: { field: "last_login", fallback: "Never" },
    },
    {
      headerName: "Status",
      field: "is_active",
      flex: 0.9,
      minWidth: 110,
      cellRenderer: "statusBadge",
    },
    {
      headerName: "Actions",
      colId: "__actions",
      flex: 1,
      minWidth: 200,
      pinned: "right",
      sortable: false,
      filter: false,
      cellRenderer: "userActions",
      cellRendererParams: {
        onSuspend: (u: AdminUser) => {
          if (u.is_active) setSuspendTarget(u)
          else {
            suspend.mutate({
              id: u.id,
              is_suspended: false,
              reason: "Reactivated by admin",
            })
          }
        },
        onResetPw: (u: AdminUser) => resetPw.mutate(u.id),
        onDelete: (u: AdminUser) => {
          if (confirm(`Delete user "${u.username}"?`)) del.mutate(u.id)
        },
        pending: {
          suspend: suspend.isPending,
          del: del.isPending,
          resetPw: resetPw.isPending,
        },
      },
    },
  ]

  return (
    <>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Page header */}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Users
            </h1>
            <p className="text-xs text-muted-foreground">
              Every account across all roles.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
            onClick={() => setShowCreateDialog(true)}
          >
            <IconPlus className="size-3.5" />
            Create System Admin
          </Button>
        </div>

        {/* Filters */}
        <div>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-48 flex-1">
                <IconSearch className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search username or email…"
                  className="h-9 pl-8"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v as typeof roleFilter)
                  setPage(1)
                }}
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
                onValueChange={(v) => {
                  setStatusFilter(v as typeof statusFilter)
                  setPage(1)
                }}
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
        </div>

        {/* Table */}
        <AgTable<AdminUser>
          rowData={users}
          columnDefs={columnDefs}
          components={{
            userCell: UserCell as unknown as AgCellRenderer<AdminUser>,
            roleBadge: RoleBadgeCell as unknown as AgCellRenderer<AdminUser>,
            hospitalLink:
              HospitalLinkCell as unknown as AgCellRenderer<AdminUser>,
            statusBadge:
              StatusBadgeCell as unknown as AgCellRenderer<AdminUser>,
            dateFromRow: UserDateCell as unknown as AgCellRenderer<AdminUser>,
            userActions:
              UserActionsCell as unknown as AgCellRenderer<AdminUser>,
          }}
          mode="server"
          pageSize={PAGE_SIZE}
          totalRows={totalCount}
          onPageChange={setPage}
          disableExportDialogOnCellClick
          loading={isLoading}
          noRowsText={
            filtersDirty ? "No users match these filters" : "No users yet"
          }
        />
      </div>

      <SuspendDialog
        title={suspendTarget ? `Suspend "${suspendTarget.username}"?` : ""}
        description="The user will not be able to log in until reactivated."
        confirmLabel="Suspend user"
        open={Boolean(suspendTarget)}
        onCancel={() => setSuspendTarget(null)}
        onConfirm={(reason) => {
          if (!suspendTarget) return
          suspend.mutate(
            { id: suspendTarget.id, is_suspended: true, reason },
            { onSuccess: () => setSuspendTarget(null) }
          )
        }}
        loading={suspend.isPending}
      />

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
  )
}

// ── Local action cell ─────────────────────────────────────────────────
//
// User management needs an extra "Reset pw" + "View hospital" button beyond
// what the shared `UserActionsCell` offers, so we define it inline. Uses
// `BadgePill` to keep the badge styling consistent.

function UserActionsCell({
  row,
  onSuspend,
  onResetPw,
  onDelete,
  pending,
}: {
  row: AdminUser
  onSuspend: (u: AdminUser) => void
  onResetPw: (u: AdminUser) => void
  onDelete: (u: AdminUser) => void
  pending: { suspend?: boolean; del?: boolean; resetPw?: boolean }
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {row.is_active ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          data-cell-click-ignore
          onClick={() => onSuspend(row)}
          title="Suspend"
          className="text-destructive hover:bg-destructive/10"
        >
          <IconShieldOff className="size-3" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          data-cell-click-ignore
          disabled={pending.suspend}
          onClick={() => onSuspend(row)}
          title="Reactivate"
        >
          <IconPlus className="size-3" />
        </Button>
      )}
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        data-cell-click-ignore
        disabled={pending.resetPw}
        title="Send password reset email"
        onClick={() => onResetPw(row)}
      >
        <IconLock className="size-3" />
      </Button>
      {row.hospital_id && (
        <Button
          asChild
          type="button"
          size="icon-sm"
          variant="ghost"
          data-cell-click-ignore
          title="View linked hospital"
        >
          <Link href={`/hospital/${row.hospital_id}`}>
            <IconBuildingHospital className="size-3" />
          </Link>
        </Button>
      )}
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        data-cell-click-ignore
        disabled={pending.del}
        onClick={() => onDelete(row)}
        title="Delete"
        className="text-destructive hover:bg-destructive/10"
      >
        <IconTrash className="size-3" />
      </Button>
    </div>
  )
}

// ── Local helpers ─────────────────────────────────────────────────────

function UserDateCell({
  row,
  field,
  fallback,
}: {
  row: AdminUser
  field: keyof AdminUser
  fallback?: string
}) {
  const raw = row[field] as string | null | undefined
  if (!raw) {
    return <span className="text-muted-foreground">{fallback ?? "—"}</span>
  }
  return (
    <span className="text-muted-foreground tabular-nums">
      {new Date(raw).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}
    </span>
  )
}
