"use client";

/**
 * Shared cell renderers used across admin/hospital-admin tables. Each
 * renderer accepts `{ row }` (typed via the generic on the consuming page)
 * and returns JSX. None of them call `pushToast` directly — mutation
 * `onSuccess`/`onError` callbacks live in the page.
 */

import * as React from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconCheck,
  IconCircleCheck,
  IconPencil,
  IconShieldCheck,
  IconShieldOff,
  IconTrash,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  formatRelativeTime,
  formatDateTime,
  relativeFromNow,
} from "@/lib/hospital-utils";
import type { AdminHospital, AdminUser, UpdateHistoryRow } from "@/lib/api/admin";
import type { Ambulance } from "@/lib/types/ambulance";

// ── Generic helpers ───────────────────────────────────────────────────

export type BadgeVariant =
  | "teal"
  | "amber"
  | "red"
  | "emerald"
  | "blue"
  | "muted";

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  teal: "bg-niramoy-teal/10 text-niramoy-teal",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  red: "bg-destructive/10 text-destructive",
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  muted: "bg-muted text-muted-foreground",
};

export function BadgePill({
  children,
  variant,
  icon,
}: {
  children: React.ReactNode;
  variant: BadgeVariant;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${BADGE_CLASSES[variant]}`}
    >
      {icon}
      {children}
    </span>
  );
}

// ── Hospitals ─────────────────────────────────────────────────────────

export function HospitalNameCell({ row }: { row: AdminHospital }) {
  return (
    <div>
      <span className="font-medium">{row.name}</span>
      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
        #{row.id}
      </div>
    </div>
  );
}

export function DistrictCell({ row }: { row: AdminHospital }) {
  return (
    <div className="text-muted-foreground">
      <div>{row.district}</div>
      {row.division && (
        <div className="text-[10px]">{row.division}</div>
      )}
    </div>
  );
}

export function VerifiedBadgeCell({ row }: { row: AdminHospital }) {
  return (
    <div>
      <BadgePill
        variant={row.is_verified ? "teal" : "amber"}
        icon={
          row.is_verified ? (
            <IconShieldCheck className="size-3" />
          ) : (
            <IconShieldOff className="size-3" />
          )
        }
      >
        {row.is_verified ? "Verified" : "Pending"}
      </BadgePill>
      {!row.is_active && (
        <div className="mt-0.5">
          <BadgePill
            variant="red"
            icon={<IconShieldOff className="size-3" />}
          >
            Suspended
          </BadgePill>
        </div>
      )}
    </div>
  );
}

export function LastUpdatedCell({ row }: { row: AdminHospital }) {
  return (
    <span className="text-muted-foreground tabular-nums">
      {row.last_updated ? formatRelativeTime(row.last_updated) : "—"}
    </span>
  );
}

export function AdminPlaceholderCell() {
  return (
    <span className="text-[10px] text-muted-foreground">Hospital Admin</span>
  );
}

// ── Users ─────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  patient: "Patient",
  hospital_admin: "Hospital Admin",
  system_admin: "System Admin",
};

export function UserCell({ row }: { row: AdminUser }) {
  return (
    <div>
      <div className="font-medium">{row.username}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {row.email}
      </div>
    </div>
  );
}

export function RoleBadgeCell({ row }: { row: AdminUser }) {
  const variant: BadgeVariant =
    row.role === "system_admin"
      ? "amber"
      : row.role === "hospital_admin"
        ? "teal"
        : "muted";
  return (
    <BadgePill variant={variant}>{ROLE_LABELS[row.role] ?? row.role}</BadgePill>
  );
}

export function HospitalLinkCell({ row }: { row: AdminUser }) {
  if (!row.hospital_id) return <span className="text-muted-foreground">—</span>;
  return (
    <Link
      href={`/hospital/${row.hospital_id}`}
      className="font-mono text-niramoy-teal hover:underline"
    >
      #{row.hospital_id}
    </Link>
  );
}

export function StatusBadgeCell({ row }: { row: AdminUser }) {
  return row.is_active ? (
    <BadgePill
      variant="emerald"
      icon={<IconCheck className="size-3" />}
    >
      Active
    </BadgePill>
  ) : (
    <BadgePill variant="red" icon={<IconShieldOff className="size-3" />}>
      Suspended
    </BadgePill>
  );
}

export function DateCell({
  value,
  fallback,
}: {
  value: string | null | undefined;
  fallback?: string;
}) {
  if (!value) {
    return <span className="text-muted-foreground">{fallback ?? "—"}</span>;
  }
  return (
    <span className="text-muted-foreground tabular-nums">
      {new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}
    </span>
  );
}

// ── Updates / Audit log ───────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  BedCount: "Bed Count",
  Pricing: "Pricing",
  Profile: "Profile",
};

const TYPE_VARIANT: Record<string, BadgeVariant> = {
  BedCount: "teal",
  Pricing: "amber",
  Profile: "blue",
};

export function TypeBadgeCell({ row }: { row: UpdateHistoryRow | { update_type?: string; type?: string } }) {
  const raw = (row as { update_type?: string; type?: string }).update_type ?? (row as { type?: string }).type ?? "";
  const label = TYPE_LABELS[raw] ?? raw;
  const variant = TYPE_VARIANT[raw] ?? "muted";
  return <BadgePill variant={variant as BadgeVariant}>{label}</BadgePill>;
}

export function StatusBadgeWithReasonCell({ row }: { row: UpdateHistoryRow }) {
  const variant: BadgeVariant =
    row.status === "Pending"
      ? "amber"
      : row.status === "Live"
        ? "emerald"
        : "red";
  return (
    <div>
      <BadgePill variant={variant}>{row.status}</BadgePill>
      {row.rejection_reason && (
        <p
          className="mt-0.5 max-w-[160px] truncate text-[10px] text-muted-foreground"
          title={row.rejection_reason}
        >
          {row.rejection_reason}
        </p>
      )}
    </div>
  );
}

export function DiffCell({
  from,
  to,
}: {
  from: string | null | undefined;
  to: string | null | undefined;
}) {
  return (
    <div className="text-muted-foreground">
      {from && (
        <span className="line-through decoration-destructive/60">{from}</span>
      )}
      {from && to && <span className="mx-1">→</span>}
      {to && <span className="font-medium text-foreground">{to}</span>}
      {!from && !to && <span>—</span>}
    </div>
  );
}

export function WhenCell({ value }: { value: string }) {
  return (
    <div className="text-muted-foreground">
      <div className="tabular-nums">{formatDateTime(value)}</div>
      <div className="text-[10px]">({relativeFromNow(value)})</div>
    </div>
  );
}

// ── Ambulance directory ───────────────────────────────────────────────

export function PhoneCell({ value }: { value: string }) {
  const href = `tel:${value.replace(/\s+/g, "")}`;
  return (
    <a
      href={href}
      className="tabular-nums text-niramoy-teal underline-offset-2 hover:underline"
    >
      {value}
    </a>
  );
}

export function DayOnlyBadgeCell({ value }: { value: boolean }) {
  return value ? (
    <BadgePill
      variant="emerald"
      icon={<IconCircleCheck className="size-3" />}
    >
      24h
    </BadgePill>
  ) : (
    <span className="text-muted-foreground">Day only</span>
  );
}

// ── Row-action cell renderers ─────────────────────────────────────────

interface ActionBaseProps {
  /** Optional click-stop on the row (so row-click nav doesn't fire). */
  onClickStop?: boolean;
}

export function HospitalActionsCell({
  row,
  onView,
  onEdit,
  onVerify,
  onSuspend,
  onDelete,
  pending,
}: ActionBaseProps & {
  row: AdminHospital;
  onView: (h: AdminHospital) => void;
  onEdit: (h: AdminHospital) => void;
  onVerify: (h: AdminHospital) => void;
  onSuspend: (h: AdminHospital) => void;
  onDelete: (h: AdminHospital) => void;
  pending: {
    verify?: boolean;
    suspend?: boolean;
    del?: boolean;
  };
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        data-cell-click-ignore
        onClick={() => onView(row)}
        title="View"
      >
        <IconArrowRight className="size-3" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        data-cell-click-ignore
        onClick={() => onEdit(row)}
        title="Edit"
      >
        <IconPencil className="size-3" />
      </Button>
      {row.is_verified ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          data-cell-click-ignore
          disabled={pending.verify}
          onClick={() => onVerify(row)}
          title="Unverify"
        >
          <IconShieldOff className="size-3" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon-sm"
          className="bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
          data-cell-click-ignore
          disabled={pending.verify}
          onClick={() => onVerify(row)}
          title="Verify"
        >
          <IconCheck className="size-3" />
        </Button>
      )}
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
          <IconCheck className="size-3" />
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
  );
}

export function UserActionsCell({
  row,
  onSuspend,
  onDelete,
  pending,
}: ActionBaseProps & {
  row: AdminUser;
  onSuspend: (u: AdminUser) => void;
  onDelete: (u: AdminUser) => void;
  pending: { suspend?: boolean; del?: boolean };
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
          onClick={() => onSuspend(row)}
          title="Reactivate"
        >
          <IconCheck className="size-3" />
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
  );
}

export function UpdateActionsCell({
  row,
  onApprove,
  onReject,
  pending,
}: ActionBaseProps & {
  row: UpdateHistoryRow;
  onApprove: (r: UpdateHistoryRow) => void;
  onReject: (r: UpdateHistoryRow) => void;
  pending: { approve?: boolean };
}) {
  if (row.status === "Pending") {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          size="sm"
          data-cell-click-ignore
          disabled={pending.approve}
          onClick={() => onApprove(row)}
          className="h-6 gap-1 bg-emerald-500/10 px-2 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
        >
          <IconCheck className="size-3" />
          Approve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-cell-click-ignore
          onClick={() => onReject(row)}
          className="h-6 text-destructive hover:bg-destructive/10"
        >
          <IconShieldOff className="size-3" />
          Reject
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        data-cell-click-ignore
        disabled={pending.approve}
        onClick={() => onApprove(row)}
        title="Re-open as pending"
      >
        <IconArrowRight className="size-3" />
      </Button>
    </div>
  );
}

export function AmbulanceActionsCell({
  row,
  onEdit,
  onRemove,
}: ActionBaseProps & {
  row: Ambulance;
  onEdit: (a: Ambulance) => void;
  onRemove: (a: Ambulance) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-cell-click-ignore
        onClick={() => onEdit(row)}
        className="h-6"
      >
        <IconPencil className="size-3" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        data-cell-click-ignore
        onClick={() => onRemove(row)}
        aria-label={`Remove ${row.name}`}
        title="Remove"
        className="text-destructive hover:bg-destructive/10"
      >
        <IconTrash className="size-3" />
      </Button>
    </div>
  );
}
