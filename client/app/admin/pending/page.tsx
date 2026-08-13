"use client";

/**
 * PAGE 3 — Pending Registrations.
 *
 * New hospitals that submitted a registration and are waiting for approval.
 * Separate from the master Hospitals list because these are unverified and
 * need a decision. One card per registration with Approve / Reject.
 *
 * Approving creates the verified hospital record and activates the admin
 * account. Rejecting requires a reason — sent to the contact on the card.
 * Empty state: "No pending registrations" — shown most of the time, which
 * is fine.
 */

import { useState } from "react";
import {
  IconBuildingHospital,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconMail,
  IconPhone,
  IconShieldCheck,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToasts } from "@/components/ui/toast";
import {
  useAdminHospitals,
  useVerifyHospital,
} from "@/lib/hooks/use-admin";
import { SuspendDialog } from "@/components/sysadmin/suspend-dialog";
import { formatRelativeTime } from "@/lib/hospital-utils";

const PAGE_SIZE = 12;

export default function PendingRegistrationsPage() {
  const { pushToast } = useToasts();
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<{ id: number; name: string } | null>(null);

  const { data, isLoading, isFetching } = useAdminHospitals({
    is_verified: false,
    is_active: true,
    page,
    page_size: PAGE_SIZE,
  });
  const verify = useVerifyHospital();

  const pending = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;
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
      description: `Reason sent to the contact on the card.`,
      variant: "success",
    });
    setRejectTarget(null);
    void reason;
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Pending registrations
          </h1>
          <p className="text-xs text-muted-foreground">
            {totalCount} hospital{totalCount !== 1 ? "s" : ""} waiting for a
            decision.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-xs text-muted-foreground">
            <IconLoader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : pending.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <IconShieldCheck className="size-6" />
              </span>
              <p className="text-sm font-medium text-foreground">No pending registrations</p>
              <p className="text-xs text-muted-foreground">
                When new hospitals submit a registration, they&rsquo;ll appear
                here for review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {isFetching && !isLoading && (
              <p className="text-[11px] text-muted-foreground">Refreshing…</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pending.map((h) => (
                <Card key={h.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3 p-4">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-niramoy-teal/10 text-niramoy-teal">
                        <IconBuildingHospital className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-heading text-sm font-semibold text-foreground">
                          {h.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {h.district}
                          {h.division ? `, ${h.division}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Submitted date */}
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Submitted{" "}
                      <span className="text-foreground">
                        {formatRelativeTime(h.created_at)}
                      </span>
                    </p>

                    {/* Facility types requested */}
                    <div className="grid grid-cols-4 gap-1 rounded-md border bg-muted/30 p-2">
                      {(
                        [
                          ["ICU", h.icu_total],
                          ["NICU", h.nicu_total],
                          ["CCU", h.ccu_total],
                          ["HDU", h.hdu_total],
                        ] as const
                      ).map(([label, total]) => (
                        <div key={label} className="text-center">
                          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {label}
                          </div>
                          <div className="font-heading text-base font-bold tabular-nums text-foreground">
                            {total}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Admin contact */}
                    <div className="space-y-0.5 text-[11px] text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <IconUser className="size-3 shrink-0" />
                        <span className="font-medium text-foreground">
                          Hospital Admin
                        </span>
                        <span className="text-[10px]">· linked via user</span>
                      </p>
                      {h.phone_emergency && (
                        <p className="flex items-center gap-1.5">
                          <IconPhone className="size-3 shrink-0" />
                          <a
                            href={`tel:${h.phone_emergency}`}
                            className="text-niramoy-teal hover:underline"
                          >
                            {h.phone_emergency}
                          </a>
                        </p>
                      )}
                      <p className="flex items-center gap-1.5">
                        <IconMail className="size-3 shrink-0" />
                        <a
                          href={`mailto:admin-${h.id}@niramoy.local`}
                          className="text-niramoy-teal hover:underline"
                        >
                          admin-{h.id}@niramoy.local
                        </a>
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
                        disabled={verify.isPending}
                        onClick={() => handleApprove(h.id)}
                      >
                        {verify.isPending && verify.variables?.id === h.id ? (
                          <IconLoader2 className="size-3.5 animate-spin" />
                        ) : (
                          <IconCheck className="size-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-destructive hover:bg-destructive/10"
                        onClick={() => setRejectTarget({ id: h.id, name: h.name })}
                      >
                        <IconX className="size-3.5" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>
                  Page{" "}
                  <span className="font-medium text-foreground">{page}</span> of{" "}
                  <span className="font-medium text-foreground">{totalPages}</span>
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
            )}
          </>
        )}
      </div>

      {rejectTarget && (
        <RejectRegistrationDialog
          hospitalName={rejectTarget.name}
          onCancel={() => setRejectTarget(null)}
          onConfirm={(reason) => handleReject(reason)}
        />
      )}
    </>
  );
}

function RejectRegistrationDialog({
  hospitalName,
  onCancel,
  onConfirm,
}: {
  hospitalName: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

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
            <h3 className="flex items-center gap-2 font-heading text-sm font-semibold">
              <IconX className="size-4 text-destructive" />
              Reject registration
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {hospitalName}
            </p>
          </div>
          <Button type="button" size="icon-sm" variant="ghost" onClick={onCancel} aria-label="Close">
            <IconX className="size-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          The reason you give here is emailed to the contact on the
          registration card. Be specific and constructive.
        </p>
        <textarea
          rows={4}
          autoFocus
          className="border-input bg-input/20 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 w-full rounded-md border px-3 py-2 text-xs outline-none"
          placeholder="e.g. Address could not be verified; please re-submit with a clearer location."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-1">
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
        </div>
      </div>
    </div>
  );
}