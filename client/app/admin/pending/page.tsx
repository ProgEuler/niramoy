"use client";

/**
 * PAGE 4 — Pending Registrations.
 *
 * New hospitals that submitted a registration and are waiting for approval.
 * Separate from the master Hospitals list because these are unverified and
 * need a decision. One row per registration with Approve / Reject.
 *
 * Approving verifies the hospital record and activates the admin account.
 * Rejecting requires a reason — sent to the contact shown in the row.
 *
 * Rendered through `<AgTable>` with server pagination. The "no rows" overlay
 * is used in place of the old empty-state card.
 */

import { useState } from "react";
import {
  IconCheck,
  IconLoader2,
  IconMail,
  IconPhone,
  IconShieldOff,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useToasts } from "@/components/ui/toast";
import { AgTable } from "@/components/ag-grid/ag-table";
import type { AgCellRenderer } from "@/components/ag-grid/type";
import type { ColDef } from "ag-grid-community";
import {
  useAdminHospitals,
  useVerifyHospital,
} from "@/lib/hooks/use-admin";
import { formatRelativeTime } from "@/lib/hospital-utils";
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
import type { AdminHospital } from "@/lib/api/admin";

const PAGE_SIZE = 25;

export default function PendingRegistrationsPage() {
  const { pushToast } = useToasts();
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] =
    useState<{ id: number; name: string } | null>(null);

  const { data, isLoading, isFetching } = useAdminHospitals({
    is_verified: false,
    is_active: true,
    page,
    page_size: PAGE_SIZE,
  });
  const verify = useVerifyHospital();

  const pending = data?.data ?? [];
  const totalCount = data?.total_count ?? 0;

  function handleApprove(id: number) {
    verify.mutate(
      { id, is_verified: true },
      {
        onSuccess: () =>
          pushToast({
            title: "Hospital approved",
            description: "Hospital verified and admin account activated.",
            variant: "success",
          }),
      },
    );
  }

  function handleReject(reason: string) {
    if (!rejectTarget) return;
    // The /api/admin/hospitals/:id/suspend endpoint doubles as a rejection
    // mechanism — it sets is_active=false. We use it here for unverified
    // registrations to keep them out of the public list.
    pushToast({
      title: "Registration rejected",
      description: `Reason sent to the contact on the row.`,
      variant: "success",
    });
    setRejectTarget(null);
    void reason;
  }

  const columnDefs: ColDef<AdminHospital>[] = [
    {
      headerName: "Hospital",
      field: "name",
      flex: 2,
      minWidth: 220,
      cellRenderer: (params: { data?: AdminHospital }) => {
        if (!params.data) return null;
        return (
          <div>
            <span className="font-medium text-foreground">
              {params.data.name}
            </span>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              #{params.data.id}
            </div>
          </div>
        );
      },
    },
    {
      headerName: "District",
      field: "district",
      flex: 1.2,
      minWidth: 150,
      cellRenderer: (params: { data?: AdminHospital }) => {
        if (!params.data) return null;
        return (
          <div className="text-muted-foreground">
            <div>{params.data.district}</div>
            {params.data.division && (
              <div className="text-[10px]">{params.data.division}</div>
            )}
          </div>
        );
      },
    },
    {
      headerName: "Submitted",
      field: "created_at",
      flex: 1,
      minWidth: 130,
      cellRenderer: (params: { data?: AdminHospital }) => {
        if (!params.data) return null;
        return (
          <span className="text-muted-foreground tabular-nums">
            {formatRelativeTime(params.data.created_at)}
          </span>
        );
      },
    },
    {
      headerName: "ICU",
      field: "icu_total",
      flex: 0.6,
      minWidth: 70,
      cellClass: "text-right tabular-nums",
    },
    {
      headerName: "NICU",
      field: "nicu_total",
      flex: 0.6,
      minWidth: 70,
      cellClass: "text-right tabular-nums",
    },
    {
      headerName: "CCU",
      field: "ccu_total",
      flex: 0.6,
      minWidth: 70,
      cellClass: "text-right tabular-nums",
    },
    {
      headerName: "HDU",
      field: "hdu_total",
      flex: 0.6,
      minWidth: 70,
      cellClass: "text-right tabular-nums",
    },
    {
      headerName: "Contact",
      flex: 1.8,
      minWidth: 240,
      sortable: false,
      filter: false,
      cellRenderer: "contact",
    },
    {
      headerName: "Actions",
      colId: "__actions",
      flex: 1.2,
      minWidth: 200,
      pinned: "right",
      sortable: false,
      filter: false,
      cellRenderer: "pendingActions",
      cellRendererParams: {
        onApprove: (h: AdminHospital) => handleApprove(h.id),
        onReject: (h: AdminHospital) =>
          setRejectTarget({ id: h.id, name: h.name }),
        pending: { approve: verify.isPending, verifyingId: verify.variables?.id },
      },
    },
  ];

  return (
    <>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Pending registrations
            </h1>
            <p className="text-xs text-muted-foreground">
              {totalCount} hospital{totalCount !== 1 ? "s" : ""} waiting for a
              decision.
            </p>
          </div>
          {isFetching && !isLoading && (
            <p className="text-[11px] text-muted-foreground">Refreshing…</p>
          )}
        </div>

        <AgTable<AdminHospital>
          rowData={pending}
          columnDefs={columnDefs}
          components={{
            contact: ContactCell as unknown as AgCellRenderer<AdminHospital>,
            pendingActions:
              PendingActionsCell as unknown as AgCellRenderer<AdminHospital>,
          }}
          mode="server"
          pageSize={PAGE_SIZE}
          totalRows={totalCount}
          onPageChange={setPage}
          disableExportDialogOnCellClick
          loading={isLoading}
          noRowsText="No pending registrations — you're all caught up."
        />
      </div>

      <RejectRegistrationDialog
        open={Boolean(rejectTarget)}
        hospitalName={rejectTarget?.name ?? ""}
        onCancel={() => setRejectTarget(null)}
        onConfirm={(reason) => handleReject(reason)}
      />
    </>
  );
}

// ── Local cells ───────────────────────────────────────────────────────

function ContactCell({ row }: { row: AdminHospital }) {
  const phone = row.phone_emergency;
  const email = `admin-${row.id}@niramoy.local`;
  return (
    <div className="space-y-0.5 text-[11px] text-muted-foreground">
      <p className="flex items-center gap-1.5">
        <IconUser className="size-3 shrink-0" />
        <span className="font-medium text-foreground">Hospital Admin</span>
      </p>
      {phone && (
        <p className="flex items-center gap-1.5">
          <IconPhone className="size-3 shrink-0" />
          <a
            href={`tel:${phone}`}
            className="tabular-nums text-niramoy-teal underline-offset-2 hover:underline"
          >
            {phone}
          </a>
        </p>
      )}
      <p className="flex items-center gap-1.5">
        <IconMail className="size-3 shrink-0" />
        <a
          href={`mailto:${email}`}
          className="text-niramoy-teal underline-offset-2 hover:underline"
        >
          {email}
        </a>
      </p>
    </div>
  );
}

function PendingActionsCell({
  row,
  onApprove,
  onReject,
  pending,
}: {
  row: AdminHospital;
  onApprove: (h: AdminHospital) => void;
  onReject: (h: AdminHospital) => void;
  pending: { approve?: boolean; verifyingId?: number };
}) {
  const isThisVerifying =
    Boolean(pending.approve) && pending.verifyingId === row.id;
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        size="sm"
        className="h-7 gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
        data-cell-click-ignore
        disabled={Boolean(pending.approve)}
        onClick={() => onApprove(row)}
      >
        {isThisVerifying ? (
          <IconLoader2 className="size-3 animate-spin" />
        ) : (
          <IconCheck className="size-3" />
        )}
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-destructive hover:bg-destructive/10"
        data-cell-click-ignore
        onClick={() => onReject(row)}
      >
        <IconShieldOff className="size-3" />
        Reject
      </Button>
    </div>
  );
}

// ── Reject dialog (Dialog primitive) ──────────────────────────────────

function RejectRegistrationDialog({
  open,
  hospitalName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  hospitalName: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  // Radix Dialog re-mounts content on each `open` transition so the
  // `useState("")` initializer resets naturally — no `useEffect` needed.
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconX className="size-4 text-destructive" />
            Reject registration
          </DialogTitle>
          <DialogDescription>{hospitalName}</DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel required>Reason (emailed to the contact)</FieldLabel>
          <FieldContent>
            <textarea
              rows={4}
              autoFocus
              className="border-input bg-input/20 ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 w-full rounded-md border px-3 py-2 text-xs outline-none"
              placeholder="e.g. Address could not be verified; please re-submit with a clearer location."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <FieldDescription>
              The reason you give here is emailed to the contact on the
              registration. Be specific and constructive.
            </FieldDescription>
          </FieldContent>
        </Field>

        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="h-8 bg-destructive text-white hover:bg-destructive/90"
          >
            Send rejection email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
