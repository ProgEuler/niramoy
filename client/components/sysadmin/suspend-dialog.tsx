"use client";

import { useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";

interface SuspendDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  /** Controlled open state. Dialog is unmounted when false. */
  open?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function SuspendDialog({
  title,
  description,
  confirmLabel,
  open = true,
  onCancel,
  onConfirm,
  loading,
}: SuspendDialogProps) {
  // Reason resets every time the dialog re-opens because Radix Dialog
  // mounts the content fresh on each `open` transition, so `useState`'s
  // initializer runs again — no `useEffect` reset needed.
  const [reason, setReason] = useState("");

  function handleConfirm() {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel required>Reason</FieldLabel>
          <FieldContent>
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
              <FieldDescription>A reason is required.</FieldDescription>
            )}
          </FieldContent>
        </Field>

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}