"use client"

/**
 * PAGE 4 — Update moderation queue (system admin).
 *
 * Lists every row in `update_history` for review. Tabs filter by status
 * (Pending / Approved / Rejected / All); per-row actions Approve / Reject
 * (with reason modal) or Reopen. A bulk-approve bar appears when one or
 * more pending rows are selected.
 *
 * Rendered through `<AgTable>` with `bulkSelect` for the tri-state header
 * checkbox, so multi-row approve works without writing our own checkbox
 * column.
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  IconCircleCheck,
  IconClipboardCheck,
  IconClipboardX,
  IconLoader2,
  IconRefresh,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AgTable } from "@/components/ag-grid/ag-table"
import type { AgCellRenderer } from "@/components/ag-grid/type"
import type { ColDef } from "ag-grid-community"
import {
  StatusBadgeWithReasonCell,
  TypeBadgeCell,
  UpdateActionsCell,
} from "@/components/ag-grid/ag-table-cells"
import {
  useAdminUpdates,
  useApproveUpdate,
  useRejectUpdate,
} from "@/lib/hooks/use-admin"
import { useToasts } from "@/components/ui/toast"
import type { UpdateHistoryRow } from "@/lib/api/admin"

const PAGE_SIZE = 25
type StatusFilter = "all" | "Pending" | "Live" | "Rejected"

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Pending", label: "Pending" },
  { id: "Live", label: "Approved" },
  { id: "Rejected", label: "Rejected" },
]

export default function ModerationQueuePage() {
  const { pushToast } = useToasts()
  const [tab, setTab] = useState<StatusFilter>("Pending")
  const [updateType, setUpdateType] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [rejectTarget, setRejectTarget] = useState<UpdateHistoryRow | null>(
    null
  )
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const { data, isLoading, isFetching } = useAdminUpdates({
    page,
    page_size: PAGE_SIZE,
    status: tab === "all" ? undefined : tab,
    update_type: updateType === "all" ? undefined : updateType,
  })

  const approve = useApproveUpdate()
  const reject = useRejectUpdate()

  const updates = data?.data ?? []
  const totalCount = data?.total_count ?? 0

  // Only Pending rows are eligible for bulk approve — the `isRowSelectable`
  // predicate wires that into AgTable's bulkSelect so non-Pending rows
  // never appear in the header checkbox calculation.
  const isRowSelectable = (u: UpdateHistoryRow) => u.status === "Pending"

  function handleBulkApprove() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    ids.forEach((id) => approve.mutate({ id }))
    setSelected(new Set())
    pushToast({
      title: `${ids.length} update${ids.length !== 1 ? "s" : ""} approved`,
      variant: "success",
    })
  }

  const columnDefs: ColDef<UpdateHistoryRow>[] = [
    {
      headerName: "Hospital",
      field: "hospital_id",
      flex: 0.7,
      minWidth: 110,
      cellRenderer: (params: { data?: UpdateHistoryRow }) => {
        if (!params.data) return null
        return (
          <Link
            href={`/hospital/${params.data.hospital_id}`}
            className="font-medium text-foreground hover:underline"
          >
            #{params.data.hospital_id}
          </Link>
        )
      },
    },
    {
      headerName: "Type",
      field: "update_type",
      flex: 1,
      minWidth: 110,
      cellRenderer: "typeBadge",
    },
    {
      headerName: "Field",
      field: "field_name",
      flex: 1,
      minWidth: 130,
      cellRenderer: (params: { data?: UpdateHistoryRow }) => {
        if (!params.data) return null
        return params.data.field_name ? (
          <span className="text-muted-foreground">
            {params.data.field_name}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      headerName: "Previous → New",
      flex: 1.5,
      minWidth: 220,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data?: UpdateHistoryRow }) => {
        if (!params.data) return null
        const { previous_value, new_value } = params.data
        return (
          <div className="text-muted-foreground">
            {previous_value !== null && (
              <span className="line-through decoration-destructive/60">
                {previous_value}
              </span>
            )}
            {previous_value !== null && new_value !== null && (
              <span className="mx-1">→</span>
            )}
            {new_value !== null && (
              <span className="font-medium text-foreground">{new_value}</span>
            )}
            {previous_value === null && new_value === null && <span>—</span>}
          </div>
        )
      },
    },
    {
      headerName: "Submitted by",
      field: "updated_by_user_id",
      flex: 0.9,
      minWidth: 110,
      cellRenderer: (params: { data?: UpdateHistoryRow }) => {
        if (!params.data) return null
        return params.data.updated_by_user_id ? (
          <span className="text-muted-foreground">
            User #{params.data.updated_by_user_id}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      headerName: "Submitted at",
      field: "created_at",
      flex: 1.1,
      minWidth: 140,
      cellRenderer: (params: { data?: UpdateHistoryRow }) => {
        if (!params.data) return null
        return (
          <span className="text-muted-foreground tabular-nums">
            {new Date(params.data.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )
      },
    },
    {
      headerName: "Status",
      field: "status",
      flex: 1.2,
      minWidth: 150,
      cellRenderer: "statusBadgeWithReason",
    },
    {
      headerName: "Actions",
      colId: "__actions",
      flex: 1,
      minWidth: 200,
      pinned: "right",
      sortable: false,
      filter: false,
      cellRenderer: "updateActions",
      cellRendererParams: {
        onApprove: (u: UpdateHistoryRow) => approve.mutate({ id: u.id }),
        onReject: (u: UpdateHistoryRow) => setRejectTarget(u),
        pending: { approve: approve.isPending },
      },
    },
  ]

  const bulkSelect = useMemo(
    () => ({
      enabled: updates.some(isRowSelectable),
      isRowSelectable,
      getRowId: (u: UpdateHistoryRow) => u.id,
      selectedIds: selected,
      onToggle: (id: unknown) => {
        setSelected((prev) => {
          const next = new Set(prev)
          if (next.has(id as number)) next.delete(id as number)
          else next.add(id as number)
          return next
        })
      },
      onToggleAll: () => {
        const pendingIds = updates.filter(isRowSelectable).map((u) => u.id)
        const allChecked =
          pendingIds.length > 0 && pendingIds.every((id) => selected.has(id))
        setSelected((prev) => {
          const next = new Set(prev)
          if (allChecked) {
            for (const id of pendingIds) next.delete(id)
          } else {
            for (const id of pendingIds) next.add(id)
          }
          return next
        })
      },
    }),
    [updates, selected]
  )

  return (
    <>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Page title */}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Moderation queue
            </h1>
            <p className="text-xs text-muted-foreground">
              Updates submitted by hospital admins that need platform review.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div>
          <CardContent className="flex flex-wrap items-center gap-3">
            {/* Status tabs */}
            <div className="inline-flex rounded-md border bg-muted/30 p-0.5 text-xs">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id)
                    setPage(1)
                  }}
                  aria-pressed={tab === t.id}
                  className={`rounded-sm px-3 py-1 font-medium transition-colors ${
                    tab === t.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Select
              value={updateType}
              onValueChange={(v) => {
                setUpdateType(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-8 w-36">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="BedCount">Bed Count</SelectItem>
                <SelectItem value="Pricing">Pricing</SelectItem>
                <SelectItem value="Profile">Profile</SelectItem>
              </SelectContent>
            </Select>

            <p className="ml-auto text-[11px] text-muted-foreground">
              {isFetching && !isLoading
                ? "Refreshing…"
                : `${totalCount} update${totalCount !== 1 ? "s" : ""}`}
            </p>
          </CardContent>
        </div>

        {/* Bulk approve bar */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-niramoy-teal/30 bg-niramoy-teal/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">
                {selected.size}
              </span>{" "}
              pending update{selected.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={approve.isPending}
                onClick={handleBulkApprove}
                className="h-7 gap-1 bg-emerald-500 text-white hover:bg-emerald-600"
              >
                {approve.isPending ? (
                  <IconLoader2 className="size-3 animate-spin" />
                ) : (
                  <IconCircleCheck className="size-3.5" />
                )}
                Approve Selected
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <AgTable<UpdateHistoryRow>
          rowData={updates}
          columnDefs={columnDefs}
          components={{
            typeBadge:
              TypeBadgeCell as unknown as AgCellRenderer<UpdateHistoryRow>,
            statusBadgeWithReason:
              StatusBadgeWithReasonCell as unknown as AgCellRenderer<UpdateHistoryRow>,
            updateActions:
              UpdateActionsCell as unknown as AgCellRenderer<UpdateHistoryRow>,
          }}
          mode="server"
          pageSize={PAGE_SIZE}
          totalRows={totalCount}
          onPageChange={setPage}
          bulkSelect={bulkSelect}
          disableExportDialogOnCellClick
          loading={isLoading}
          noRowsText={
            updates.length === 0
              ? `Queue is empty${tab === "all" ? "" : ` (${tab.toLowerCase()})`}`
              : "No updates"
          }
        />
      </div>

      {/* Reject dialog */}
      <RejectUpdateDialog
        target={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (!rejectTarget) return
          reject.mutate(
            { id: rejectTarget.id, reason },
            { onSuccess: () => setRejectTarget(null) }
          )
        }}
        loading={reject.isPending}
      />
    </>
  )
}

// ── Reject dialog body ────────────────────────────────────────────────

function RejectUpdateDialog({
  target,
  onClose,
  onConfirm,
  loading,
}: {
  target: UpdateHistoryRow | null
  onClose: () => void
  onConfirm: (reason: string) => void
  loading?: boolean
}) {
  const [reason, setReason] = useState("")

  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconClipboardX className="size-4 text-destructive" />
            Reject this update
          </DialogTitle>
          <DialogDescription>
            {target &&
              `Hospital #${target.hospital_id} · ${
                target.field_name ?? target.update_type
              }`}
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel required>Reason (shown to hospital admin)</FieldLabel>
          <FieldContent>
            <textarea
              rows={3}
              className="w-full rounded-md border border-input bg-input/20 px-3 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              placeholder="e.g. Count exceeds total capacity — please re-check."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
            />
            <FieldDescription>
              The hospital admin sees this in their update history.
            </FieldDescription>
          </FieldContent>
        </Field>

        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!reason.trim() || loading}
            onClick={() => {
              onConfirm(reason.trim())
              setReason("")
            }}
            className="h-8 bg-destructive text-white hover:bg-destructive/90"
          >
            {loading && <IconLoader2 className="size-3.5 animate-spin" />}
            Reject update
          </Button>
        </DialogFooter>

        {/* Hidden close trigger so the SheetHeader's auto-close button works. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="hidden"
        >
          <IconX />
        </button>
      </DialogContent>
    </Dialog>
  )
}
