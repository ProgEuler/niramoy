"use client";

import { useState } from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface SuspendDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function SuspendDialog({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  loading,
}: SuspendDialogProps) {
  const [reason, setReason] = useState("");

  function handleConfirm() {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md space-y-3 rounded-t-lg border bg-card p-5 shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              {title}
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <IconX className="size-3.5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="suspend-reason"
            className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            Reason <span className="text-destructive">*</span>
          </label>
          <textarea
            id="suspend-reason"
            rows={3}
            className="border-input bg-input/20 ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 w-full rounded-md border px-3 py-2 text-xs outline-none"
            placeholder="Explain why this is being suspended…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
          />
          {!reason.trim() && (
            <p className="text-[10px] text-muted-foreground">A reason is required.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!reason.trim() || loading}
            onClick={handleConfirm}
            className="h-8 bg-destructive text-white hover:bg-destructive/90"
          >
            {loading && <IconLoader2 className="size-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
