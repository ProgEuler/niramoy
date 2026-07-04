"use client";

/**
 * Page-17 Review Updates (system admin moderation queue).
 *
 * Tabs: All | Pending | Approved | Rejected.
 * Per row: Hospital, type, before → after, submitted by, when, and three
 * actions: Approve (goes live immediately), Reject (capture reason), View.
 * A bulk-approve control makes sense for the dominant "Bed Counts" type.
 *
 * State is purely client-side; approve/reject just flip the local row's
 * status and surface a toast so the demo UX is meaningful.
 */

import { useMemo, useState } from "react";
import {
  IconCircleCheck,
  IconClipboardCheck,
  IconClipboardX,
  IconEye,
  IconNotes,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToasts } from "@/components/ui/toast";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  hospitals: Hospital[];
}

type Status = "pending" | "approved" | "rejected";
type UpdateType = "Bed Counts" | "Pricing" | "Profile";

interface Submission {
  id: string;
  hospitalId: string;
  type: UpdateType;
  field: string;
  from: string;
  to: string;
  by: string;
  at: string;
  status: Status;
  reason?: string;
}

const TABS: { id: Status | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export function ReviewUpdates({ hospitals }: Props) {
  const { pushToast } = useToasts();
  const [tab, setTab] = useState<Status | "all">("pending");
  const [submissions, setSubmissions] = useState<Submission[]>(() =>
    seedSubmissions(hospitals),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectFor, setRejectFor] = useState<Submission | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const counts = useMemo(() => {
    const out: Record<Status | "all", number> = {
      all: submissions.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const s of submissions) out[s.status] += 1;
    return out;
  }, [submissions]);

  const visible = useMemo(() => {
    return tab === "all"
      ? submissions
      : submissions.filter((s) => s.status === tab);
  }, [submissions, tab]);

  function updateStatus(id: string, status: Status, reason?: string) {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status, reason: reason ?? s.reason }
          : s,
      ),
    );
    setSelected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function handleApprove(s: Submission) {
    updateStatus(s.id, "approved");
    pushToast({
      title: "Update approved",
      description: `${s.hospitalId} · ${s.field} → live.`,
      variant: "success",
    });
  }

  function handleRejectSubmit() {
    if (!rejectFor) return;
    if (!rejectReason.trim()) {
      pushToast({
        title: "Reason required",
        description: "Tell the hospital admin why this was rejected.",
        variant: "error",
      });
      return;
    }
    updateStatus(rejectFor.id, "rejected", rejectReason.trim());
    pushToast({
      title: "Update rejected",
      description: `${rejectFor.hospitalId} will see your reason in their history.`,
      variant: "info",
    });
    setRejectFor(null);
    setRejectReason("");
  }

  function toggleSelect(id: string) {
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
    const ids = [...selected];
    if (ids.length === 0) return;
    setSubmissions((prev) =>
      prev.map((s) =>
        ids.includes(s.id) && s.type === "Bed Counts"
          ? { ...s, status: "approved" }
          : s,
      ),
    );
    pushToast({
      title: `Approved ${ids.length} bed-count updates`,
      description: ids.length === 1
        ? "One row updated."
        : `${ids.length} rows updated.`,
      variant: "success",
    });
    clearSelection();
  }

  const bulkable = visible.filter(
    (s) => s.status === "pending" && s.type === "Bed Counts" && selected.has(s.id),
  );
  const selectedAllBedPending =
    visible.filter((s) => s.status === "pending" && s.type === "Bed Counts")
      .length > 0 &&
    visible
      .filter((s) => s.status === "pending" && s.type === "Bed Counts")
      .every((s) => selected.has(s.id));

  function selectAllBedPending() {
    const ids = visible
      .filter((s) => s.status === "pending" && s.type === "Bed Counts")
      .map((s) => s.id);
    if (selectedAllBedPending) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
                <IconClipboardCheck className="size-4 text-niramoy-teal" />
                Moderation queue
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Review changes submitted by hospital admins. Approving makes
                the update live immediately.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-md border bg-muted/30 p-0.5 text-xs">
              {TABS.map((t) => {
                const on = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`relative inline-flex items-center gap-1 rounded-sm px-2.5 py-1 font-medium transition-colors ${
                      on
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-pressed={on}
                  >
                    {t.label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                        on ? "bg-niramoy-teal/10 text-niramoy-teal" : "bg-card/60 text-muted-foreground"
                      }`}
                    >
                      {counts[t.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            {bulkable.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {selected.size} selected
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBulkApprove}
                  className="h-7 gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
                >
                  <IconCircleCheck className="size-3" />
                  Bulk approve
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="h-7 gap-1 text-muted-foreground"
                >
                  <IconX className="size-3" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center text-xs text-muted-foreground">
              <IconClipboardCheck className="size-6 opacity-40" />
              <p className="font-medium">Queue is clear</p>
              <p>No {tab === "all" ? "" : tab} updates to review right now.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">
                      <BulkSelect
                        onClick={selectAllBedPending}
                        checked={selectedAllBedPending}
                      />
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Hospital
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Change
                    </th>
                    <th className="px-3 py-2 text-left font-medium">By</th>
                    <th className="px-3 py-2 text-left font-medium">
                      When
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => {
                    const h = hospitals.find((x) => x.id === s.hospitalId);
                    const bulkableRow =
                      s.status === "pending" && s.type === "Bed Counts";
                    return (
                      <tr
                        key={s.id}
                        className="border-t bg-card align-top transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-2">
                          {bulkableRow ? (
                            <input
                              type="checkbox"
                              className="size-3.5 accent-niramoy-teal"
                              checked={selected.has(s.id)}
                              onChange={() => toggleSelect(s.id)}
                              aria-label="Select for bulk action"
                            />
                          ) : (
                            <span className="text-muted-foreground/40">·</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">
                            {h?.name ?? s.hospitalId}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {s.hospitalId}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeBadge(s.type)}`}>
                            {s.type}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">
                            {s.field}
                          </div>
                          <div className="mt-0.5 tabular-nums">
                            <span className="text-muted-foreground line-through">
                              {s.from}
                            </span>
                            <span className="mx-1 text-muted-foreground">→</span>
                            <span className="font-semibold text-foreground">
                              {s.to}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {s.by}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground tabular-nums">
                          {s.at}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={s.status} reason={s.reason} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            {s.status === "pending" ? (
                              <>
                                <Button
                                  type="button"
                                  size="xs"
                                  onClick={() => handleApprove(s)}
                                  className="h-6 gap-1 bg-emerald-500 text-white hover:bg-emerald-600"
                                >
                                  <IconCircleCheck className="size-3" />
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => {
                                    setRejectFor(s);
                                    setRejectReason("");
                                  }}
                                  className="h-6 gap-1 text-destructive"
                                >
                                  <IconClipboardX className="size-3" />
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                onClick={() => {
                                  setSubmissions((prev) =>
                                    prev.map((x) =>
                                      x.id === s.id
                                        ? { ...x, status: "pending" }
                                        : x,
                                    ),
                                  );
                                  pushToast({
                                    title: "Reopened for review",
                                    variant: "info",
                                  });
                                }}
                                className="h-6 gap-1 text-muted-foreground"
                              >
                                <IconRefresh className="size-3" />
                                Reopen
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              aria-label="View"
                              className="text-muted-foreground"
                            >
                              <IconEye className="size-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {rejectFor && (
        <RejectDialog
          submission={rejectFor}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onCancel={() => {
            setRejectFor(null);
            setRejectReason("");
          }}
          onConfirm={handleRejectSubmit}
        />
      )}
    </div>
  );
}

function BulkSelect({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={checked ? "Deselect all" : "Select all"}
      className="inline-flex size-6 items-center justify-center rounded-sm border bg-card hover:bg-muted"
    >
      {checked ? (
        <IconCircleCheck className="size-3.5 text-niramoy-teal" />
      ) : (
        <span className="size-3.5 rounded-sm border" />
      )}
    </button>
  );
}

function StatusBadge({
  status,
  reason,
}: {
  status: Status;
  reason?: string;
}) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400"
        title={reason}
      >
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
      Pending
    </span>
  );
}

function typeBadge(t: UpdateType): string {
  switch (t) {
    case "Bed Counts":
      return "bg-niramoy-teal/10 text-niramoy-teal";
    case "Pricing":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "Profile":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  }
}

function RejectDialog({
  submission,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  submission: Submission;
  reason: string;
  onReasonChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Reject update"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-t-lg border bg-card p-4 shadow-lg sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="flex items-center gap-2 font-heading text-sm font-semibold">
            <IconClipboardX className="size-4 text-destructive" />
            Reject this update
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <IconX className="size-3.5" />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          <span className="font-mono">{submission.hospitalId}</span> · {submission.field}
        </p>
        <label
          htmlFor="reason"
          className="mt-3 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          <IconNotes className="size-3" />
          Reason (shown to hospital admin)
        </label>
        <textarea
          id="reason"
          rows={3}
          className="border-input bg-input/20 ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 mt-1 min-h-20 w-full rounded-md border px-3 py-2 text-xs outline-none"
          placeholder="e.g. Capacity exceeds total bed count — please re-check."
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            className="h-8 bg-destructive text-white hover:bg-destructive/90"
          >
            Reject update
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── synthetic data ────────────────────────────────────────────────────────────

const REVIEWERS = ["Dr. Karim", "Sumaiya R.", "Admin", "Mahmood H."];

function seedSubmissions(hospitals: Hospital[]): Submission[] {
  const types: UpdateType[] = ["Bed Counts", "Pricing", "Profile"];
  const out: Submission[] = [];
  let i = 0;
  for (const h of hospitals) {
    const count = 1 + (seedHash(h.id) % 3); // 1–3 per hospital
    for (let j = 0; j < count; j += 1) {
      const type = types[(seedHash(h.id + j.toString())) % 3];
      const { field, from, to } = pickField(type, h.id, j);
      const status: Status =
        i % 7 === 0
          ? "approved"
          : i % 11 === 0
          ? "rejected"
          : "pending";
      const minutesAgo = 30 + ((seedHash(h.id + j) >> 7) % (48 * 60));
      out.push({
        id: `${h.id}-${i}`,
        hospitalId: h.id,
        type,
        field,
        from,
        to,
        by: REVIEWERS[seedHash(h.id + "by") % REVIEWERS.length],
        at: relativeFromNow(minutesAgo * 60_000),
        status,
        reason:
          status === "rejected"
            ? "Please re-check the count."
            : undefined,
      });
      i += 1;
    }
  }
  // Pending first.
  out.sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "pending" ? -1 : 1;
  });
  return out;
}

function pickField(
  type: UpdateType,
  hospitalId: string,
  j: number,
): { field: string; from: string; to: string } {
  if (type === "Bed Counts") {
    const opts = ["ICU available", "NICU available", "CCU available", "HDU available"];
    const k = (seedHash(hospitalId + "bed" + j) >> 5) % opts.length;
    const from = 2 + ((seedHash(hospitalId + "from" + j) >> 4) % 9);
    const to = Math.max(0, from + (((seedHash(hospitalId + "d" + j) >> 3) % 7) - 3));
    return { field: opts[k], from: String(from), to: String(to) };
  }
  if (type === "Pricing") {
    const opts = ["ICU cost / day", "NICU cost / day", "CCU cost / day", "HDU cost / day"];
    const k = (seedHash(hospitalId + "p" + j) >> 6) % opts.length;
    const from = 4000 + ((seedHash(hospitalId + "pfrom" + j) >> 2) % 6000);
    const to = Math.max(0, from + (((seedHash(hospitalId + "pd" + j) >> 5) % 4000) - 2000));
    return { field: opts[k], from: `৳${from}`, to: `৳${to}` };
  }
  // Profile
  const opts = ["Phone", "Photo", "Address", "Pin location"];
  const k = (seedHash(hospitalId + "pr" + j) >> 7) % opts.length;
  if (opts[k] === "Phone") {
    return { field: "Phone", from: "+8801711550000", to: "+8801711660000" };
  }
  if (opts[k] === "Pin location") {
    return { field: "Pin location", from: "23.7800, 90.4000", to: "23.7812, 90.4016" };
  }
  if (opts[k] === "Photo") {
    return { field: "Photo", from: "cover-v1.jpg", to: "cover-v2.jpg" };
  }
  return { field: "Address", from: "12 Old Rd", to: "12/C New Ave" };
}

function relativeFromNow(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function seedHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h ^ s.charCodeAt(i) * 2654435761) >>> 0;
  }
  return h;
}