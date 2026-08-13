"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconClipboardCheck,
  IconClipboardX,
  IconLoader2,
  IconRefresh,
  IconShieldCog,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminUpdates,
  useApproveUpdate,
  useRejectUpdate,
} from "@/lib/hooks/use-admin";
import type { UpdateHistoryRow } from "@/lib/api/admin";

const PAGE_SIZE = 25;
type StatusFilter = "all" | "Pending" | "Live" | "Rejected";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Pending", label: "Pending" },
  { id: "Live", label: "Approved" },
  { id: "Rejected", label: "Rejected" },
];

const TYPE_LABELS: Record<string, string> = {
  BedCount: "Bed Count",
  Pricing: "Pricing",
  Profile: "Profile",
};

const TYPE_BADGE: Record<string, string> = {
  BedCount: "bg-niramoy-teal/10 text-niramoy-teal",
  Pricing: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Profile: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

const STATUS_BADGE: Record<string, string> = {
  Pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Live: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Rejected: "bg-destructive/10 text-destructive",
};

export default function ModerationQueuePage() {
  const [tab, setTab] = useState<StatusFilter>("Pending");
  const [updateType, setUpdateType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<UpdateHistoryRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data, isLoading, isFetching } = useAdminUpdates({
    page,
    page_size: PAGE_SIZE,
    status: tab === "all" ? undefined : tab,
    update_type: updateType === "all" ? undefined : updateType,
  });

  const approve = useApproveUpdate();
  const reject = useRejectUpdate();

  const updates = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;
  const totalCount = data?.total_count ?? 0;

  // Only Pending rows are eligible for bulk approve.
  const pendingIds = useMemo(
    () => updates.filter((u) => u.status === "Pending").map((u) => u.id),
    [updates],
  );
  const allSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));
  const someSelected = pendingIds.some((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of pendingIds) next.delete(id);
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...pendingIds]));
    }
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handleBulkApprove() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    ids.forEach((id) => approve.mutate({ id }));
    clearSelection();
  }

  function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    reject.mutate(
      { id: rejectTarget.id, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setRejectReason("");
        },
      },
    );
  }

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
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            {/* Status tabs */}
            <div className="inline-flex rounded-md border bg-muted/30 p-0.5 text-xs">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setTab(t.id); setPage(1); }}
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
              onValueChange={(v) => { setUpdateType(v); setPage(1); }}
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
        </Card>

        {/* Bulk approve bar */}
        {someSelected && (
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
                onClick={clearSelection}
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
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
                <IconLoader2 className="size-4 animate-spin" />
                Loading…
              </div>
            ) : updates.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-16 text-center text-xs text-muted-foreground">
                <IconClipboardCheck className="size-6 opacity-40" />
                <p className="font-medium">Queue is empty</p>
                <p>No {tab === "all" ? "" : tab.toLowerCase()} updates to review.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        {pendingIds.length > 0 && (
                          <th className="w-8 px-3 py-2 text-left font-medium">
                            <input
                              type="checkbox"
                              aria-label="Select all pending"
                              checked={allSelected}
                              onChange={toggleAll}
                              className="size-3.5 cursor-pointer accent-niramoy-teal"
                            />
                          </th>
                        )}
                        <th className="px-3 py-2 text-left font-medium">Hospital</th>
                        <th className="px-3 py-2 text-left font-medium">Type</th>
                        <th className="px-3 py-2 text-left font-medium">Field</th>
                        <th className="px-3 py-2 text-left font-medium">Previous → New</th>
                        <th className="px-3 py-2 text-left font-medium">Submitted by</th>
                        <th className="px-3 py-2 text-left font-medium">Submitted at</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {updates.map((u) => (
                        <tr
                          key={u.id}
                          className={`border-t bg-card transition-colors hover:bg-muted/30 ${
                            selected.has(u.id) ? "bg-niramoy-teal/5" : ""
                          }`}
                        >
                          {pendingIds.length > 0 && (
                            <td className="w-8 px-3 py-2">
                              {u.status === "Pending" && (
                                <input
                                  type="checkbox"
                                  aria-label={`Select update #${u.id}`}
                                  checked={selected.has(u.id)}
                                  onChange={() => toggleOne(u.id)}
                                  className="size-3.5 cursor-pointer accent-niramoy-teal"
                                />
                              )}
                            </td>
                          )}
                          <td className="px-3 py-2 font-medium text-foreground">
                            <Link
                              href={`/hospital/${u.hospital_id}`}
                              className="hover:underline"
                            >
                              #{u.hospital_id}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                TYPE_BADGE[u.update_type] ?? "bg-muted text-muted-foreground"
                              }`}
                            >
                              {TYPE_LABELS[u.update_type] ?? u.update_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {u.field_name ?? "—"}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {u.previous_value !== null && (
                              <span className="text-muted-foreground line-through">
                                {u.previous_value}
                              </span>
                            )}
                            {u.previous_value !== null && u.new_value !== null && (
                              <span className="mx-1 text-muted-foreground">→</span>
                            )}
                            {u.new_value !== null && (
                              <span className="font-semibold text-foreground">
                                {u.new_value}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {u.updated_by_user_id
                              ? `User #${u.updated_by_user_id}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                STATUS_BADGE[u.status] ?? "bg-muted text-muted-foreground"
                              }`}
                            >
                              {u.status}
                            </span>
                            {u.rejection_reason && (
                              <p
                                className="mt-0.5 max-w-[160px] truncate text-[10px] text-muted-foreground"
                                title={u.rejection_reason}
                              >
                                {u.rejection_reason}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              {u.status === "Pending" && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-6 gap-1 bg-emerald-500 text-white hover:bg-emerald-600"
                                    disabled={approve.isPending}
                                    onClick={() => approve.mutate({ id: u.id })}
                                  >
                                    <IconCircleCheck className="size-3" />
                                    Approve
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-6 gap-1 text-destructive"
                                    onClick={() => {
                                      setRejectTarget(u);
                                      setRejectReason("");
                                    }}
                                  >
                                    <IconClipboardX className="size-3" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {u.status !== "Pending" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 gap-1 text-muted-foreground"
                                  disabled={approve.isPending}
                                  onClick={() => approve.mutate({ id: u.id })}
                                  title="Re-open as pending"
                                >
                                  <IconRefresh className="size-3" />
                                  Reopen
                                </Button>
                              )}
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

      {/* Reject dialog */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setRejectTarget(null)}
        >
          <div
            className="w-full max-w-md space-y-3 rounded-t-lg border bg-card p-5 shadow-xl sm:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 font-heading text-sm font-semibold">
                  <IconClipboardX className="size-4 text-destructive" />
                  Reject this update
                </h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Hospital #{rejectTarget.hospital_id} · {rejectTarget.field_name ?? rejectTarget.update_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <IconX className="size-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Reason (shown to hospital admin) <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={3}
                className="border-input bg-input/20 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 w-full rounded-md border px-3 py-2 text-xs outline-none"
                placeholder="e.g. Count exceeds total capacity — please re-check."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={reject.isPending}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!rejectReason.trim() || reject.isPending}
                onClick={handleReject}
                className="h-8 bg-destructive text-white hover:bg-destructive/90"
              >
                {reject.isPending && <IconLoader2 className="size-3.5 animate-spin" />}
                Reject update
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
