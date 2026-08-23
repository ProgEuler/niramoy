"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconArrowRight,
  IconExternalLink,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconSearch,
  IconShieldCheck,
  IconShieldOff,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AgTable } from "@/components/ag-grid/ag-table";
import type { AgCellRenderer } from "@/components/ag-grid/type";
import type { ColDef } from "ag-grid-community";
import {
  HospitalActionsCell,
  AdminPlaceholderCell,
  DistrictCell,
  HospitalNameCell,
  LastUpdatedCell,
  VerifiedBadgeCell,
} from "@/components/ag-grid/ag-table-cells";
import {
  useAdminHospitals,
  useCreateHospital,
  useDeleteHospital,
  useSuspendHospital,
  useVerifyHospital,
} from "@/lib/hooks/use-admin";
import { SuspendDialog } from "@/components/sysadmin/suspend-dialog";
import { useToasts } from "@/components/ui/toast";
import { ALL_DIVISIONS } from "@/lib/types/hospital";
import { DIVISION_DISTRICTS } from "@/lib/use-districts";
import type { AdminHospital, HospitalCreatePayload } from "@/lib/api/admin";

const PAGE_SIZE = 25;

export default function ManageHospitalsPage() {
  const { pushToast } = useToasts();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isVerified, setIsVerified] = useState<"all" | "true" | "false">("all");
  const [isActive, setIsActive] = useState<"all" | "true" | "false">("all");
  const [division, setDivision] = useState<string>("all");
  const [district, setDistrict] = useState<string>("all");
  const [viewTarget, setViewTarget] = useState<AdminHospital | null>(null);
  const [editTarget, setEditTarget] = useState<AdminHospital | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminHospital | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, isFetching } = useAdminHospitals({
    page,
    page_size: PAGE_SIZE,
    search: debouncedSearch || undefined,
    is_verified: isVerified === "all" ? undefined : isVerified === "true",
    is_active: isActive === "all" ? undefined : isActive === "true",
  });

  const verify = useVerifyHospital();
  const suspend = useSuspendHospital();
  const del = useDeleteHospital();
  const create = useCreateHospital();

  const hospitals = data?.data ?? [];
  const totalCount = data?.total_count ?? 0;

  // District list derived from the visible (search-filtered) hospitals for
  // the division/district filter — keeps the dropdown honest without a
  // separate reference-data endpoint.
  const districtsForDivision = useMemo(() => {
    if (division === "all") return [];
    return Array.from(
      new Set(
        hospitals
          .filter((h) => h.division === division)
          .map((h) => h.district)
          .filter(Boolean),
      ),
    ).sort();
  }, [hospitals, division]);

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
    setIsVerified("all");
    setIsActive("all");
    setDivision("all");
    setDistrict("all");
    setPage(1);
  }

  const filtersDirty =
    debouncedSearch !== "" ||
    isVerified !== "all" ||
    isActive !== "all" ||
    division !== "all" ||
    district !== "all";

  // AgTable column defs — `cellRenderer` keys resolve to entries in
  // `components`. We disable `disableExportDialogOnCellClick` because we use
  // `onRowClicked` for navigation (side panel).
  const columnDefs = useMemo<ColDef<AdminHospital>[]>(
    () => [
      {
        headerName: "Hospital",
        field: "name",
        flex: 2,
        minWidth: 220,
        cellRenderer: "hospitalName",
      },
      {
        headerName: "District",
        field: "district",
        flex: 1.2,
        minWidth: 160,
        cellRenderer: "district",
      },
      {
        headerName: "Verified",
        field: "is_verified",
        flex: 0.9,
        minWidth: 130,
        cellRenderer: "verifiedBadge",
      },
      {
        headerName: "Last updated",
        field: "last_updated",
        flex: 1,
        minWidth: 140,
        cellRenderer: "lastUpdated",
      },
      {
        headerName: "Admin",
        flex: 0.8,
        minWidth: 120,
        sortable: false,
        filter: false,
        cellRenderer: "adminPlaceholder",
      },
      {
        headerName: "Actions",
        colId: "__actions",
        flex: 0.9,
        minWidth: 200,
        pinned: "right",
        sortable: false,
        filter: false,
        cellRenderer: "hospitalActions",
        cellRendererParams: {
          onView: (h: AdminHospital) => setViewTarget(h),
          onEdit: (h: AdminHospital) => setEditTarget(h),
          onVerify: (h: AdminHospital) =>
            verify.mutate({ id: h.id, is_verified: !h.is_verified }),
          onSuspend: (h: AdminHospital) => {
            if (h.is_active) {
              setSuspendTarget(h);
            } else {
              suspend.mutate({
                id: h.id,
                is_suspended: false,
                reason: "Reactivated by admin",
              });
            }
          },
          onDelete: (h: AdminHospital) => {
            if (confirm(`Delete "${h.name}"? This cannot be undone.`)) {
              del.mutate(h.id);
            }
          },
          pending: {
            verify: verify.isPending,
            suspend: suspend.isPending,
            del: del.isPending,
          },
        },
      },
    ],
    [verify, suspend, del],
  );

  return (
    <>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Header row with Add Hospital button */}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Hospitals
            </h1>
            <p className="text-xs text-muted-foreground">
              {totalCount} hospital{totalCount !== 1 ? "s" : ""} on the
              platform.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
            onClick={() => setShowAdd(true)}
          >
            <IconPlus className="size-3.5" />
            Add Hospital
          </Button>
        </div>

        {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-48 flex-1">
                <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search hospital name…"
                  className="h-9 pl-8"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Select
                value={division}
                onValueChange={(v) => {
                  setDivision(v);
                  setDistrict("all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All divisions</SelectItem>
                  {ALL_DIVISIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={district}
                onValueChange={(v) => {
                  setDistrict(v);
                  setPage(1);
                }}
                disabled={division === "all"}
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All districts</SelectItem>
                  {districtsForDivision.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={isVerified}
                onValueChange={(v) => {
                  setIsVerified(v as typeof isVerified);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue placeholder="Verified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All verification</SelectItem>
                  <SelectItem value="true">Verified only</SelectItem>
                  <SelectItem value="false">Unverified only</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={isActive}
                onValueChange={(v) => {
                  setIsActive(v as typeof isActive);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Suspended</SelectItem>
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
                : `${totalCount} hospital${totalCount !== 1 ? "s" : ""} found`}
            </p>

        {/* Table */}
            <AgTable<AdminHospital>
              rowData={hospitals}
              columnDefs={columnDefs}
              components={{
                hospitalName: HospitalNameCell as unknown as AgCellRenderer<AdminHospital>,
                district: DistrictCell as unknown as AgCellRenderer<AdminHospital>,
                verifiedBadge: VerifiedBadgeCell as unknown as AgCellRenderer<AdminHospital>,
                lastUpdated: LastUpdatedCell as unknown as AgCellRenderer<AdminHospital>,
                adminPlaceholder: AdminPlaceholderCell as unknown as AgCellRenderer<AdminHospital>,
                hospitalActions: HospitalActionsCell as unknown as AgCellRenderer<AdminHospital>,
              }}
              mode="server"
              pageSize={PAGE_SIZE}
              totalRows={totalCount}
              onPageChange={setPage}
              onRowClicked={(h) => setViewTarget(h)}
              disableExportDialogOnCellClick
              loading={isLoading}
              noRowsText={
                filtersDirty
                  ? "No hospitals match these filters"
                  : "No hospitals yet"
              }
            />
      </div>

      {/* Side panel: view */}
      <Sheet
        open={Boolean(viewTarget)}
        onOpenChange={(open) => !open && setViewTarget(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          {viewTarget && (
            <HospitalSidePanelBody
              hospital={viewTarget}
              onClose={() => setViewTarget(null)}
              onEdit={() => {
                setEditTarget(viewTarget);
                setViewTarget(null);
              }}
              onVerify={() =>
                verify.mutate({
                  id: viewTarget.id,
                  is_verified: !viewTarget.is_verified,
                })
              }
              onSuspend={() => {
                setSuspendTarget(viewTarget);
                setViewTarget(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Edit hospital dialog */}
      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          {editTarget && (
            <EditHospitalDialog
              hospital={editTarget}
              onClose={() => setEditTarget(null)}
              onSaved={() => {
                pushToast({ title: "Hospital updated", variant: "success" });
                setEditTarget(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add hospital dialog */}
      <Dialog
        open={showAdd}
        onOpenChange={(open) => !open && setShowAdd(false)}
      >
        <DialogContent className="sm:max-w-lg">
          <AddHospitalDialog
            onCancel={() => setShowAdd(false)}
            onConfirm={(payload) =>
              create.mutate(payload, {
                onSuccess: (data) => {
                  pushToast({
                    title: "Hospital added",
                    description: `${data.name} (#${data.id}) is now on the platform.`,
                    variant: "success",
                  });
                  setShowAdd(false);
                },
              })
            }
            loading={create.isPending}
            error={create.error?.detail}
            fieldErrors={create.error?.fieldErrors ?? []}
          />
        </DialogContent>
      </Dialog>

      {/* Suspend confirmation dialog (handles both the row button and the
          side-panel quick action). */}
      <SuspendDialog
        title={suspendTarget ? `Suspend "${suspendTarget.name}"?` : ""}
        description="The hospital will be hidden from public search and the admin's login will be disabled."
        confirmLabel="Suspend hospital"
        open={Boolean(suspendTarget)}
        onCancel={() => setSuspendTarget(null)}
        onConfirm={(reason) => {
          if (!suspendTarget) return;
          suspend.mutate(
            { id: suspendTarget.id, is_suspended: true, reason },
            { onSuccess: () => setSuspendTarget(null) },
          );
        }}
        loading={suspend.isPending}
      />
    </>
  );
}

function HospitalSidePanelBody({
  hospital,
  onClose,
  onEdit,
  onVerify,
  onSuspend,
}: {
  hospital: AdminHospital;
  onClose: () => void;
  onEdit: () => void;
  onVerify: () => void;
  onSuspend: () => void;
}) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="truncate">{hospital.name}</SheetTitle>
        <SheetDescription>
          #{hospital.id} · {hospital.district}
          {hospital.division ? `, ${hospital.division}` : ""}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
        <PanelSection title="Contact">
          <p className="text-muted-foreground">{hospital.address}</p>
          {hospital.phone_emergency && (
            <p className="mt-1">
              <span className="text-[10px] text-muted-foreground">
                Emergency:
              </span>{" "}
              <a
                href={`tel:${hospital.phone_emergency}`}
                className="text-niramoy-teal hover:underline"
              >
                {hospital.phone_emergency}
              </a>
            </p>
          )}
          {hospital.phone_general && (
            <p>
              <span className="text-[10px] text-muted-foreground">
                General:
              </span>{" "}
              <a
                href={`tel:${hospital.phone_general}`}
                className="text-niramoy-teal hover:underline"
              >
                {hospital.phone_general}
              </a>
            </p>
          )}
        </PanelSection>

        <PanelSection title="Current bed counts">
          <div className="grid grid-cols-4 gap-2 rounded-md border bg-muted/30 p-2 text-center">
            <BedMini label="ICU" total={hospital.icu_total} available={hospital.icu_available} />
            <BedMini label="NICU" total={hospital.nicu_total} available={hospital.nicu_available} />
            <BedMini label="CCU" total={hospital.ccu_total} available={hospital.ccu_available} />
            <BedMini label="HDU" total={hospital.hdu_total} available={hospital.hdu_available} />
          </div>
        </PanelSection>

        <PanelSection title="Linked admin">
          <p className="text-muted-foreground">
            Hospital Admin account (linked via /admin/users)
          </p>
        </PanelSection>

        <PanelSection title="Last 5 updates">
          <p className="text-[11px] text-muted-foreground">
            Open the moderation queue to inspect the last 5 updates from this
            hospital.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-2 h-7 gap-1">
            <Link href={`/admin/updates?hospital_id=${hospital.id}`}>
              View updates
              <IconArrowRight className="size-3" />
            </Link>
          </Button>
        </PanelSection>

        <PanelSection title="Quick actions">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
              onClick={onVerify}
            >
              <IconShieldCheck className="size-3" />
              {hospital.is_verified ? "Unverify" : "Verify"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1"
              onClick={onSuspend}
            >
              <IconShieldOff className="size-3" />
              {hospital.is_active ? "Suspend" : "Reactivate"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1"
              onClick={onEdit}
            >
              <IconPencil className="size-3" />
              Edit
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-7 gap-1">
              <Link href={`/hospital/${hospital.id}`} target="_blank">
                <IconExternalLink className="size-3" />
                View public page
              </Link>
            </Button>
          </div>
        </PanelSection>
      </div>

      {/* Hidden close trigger so SheetHeader's auto-close button works. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        className="hidden"
      />
    </>
  );
}

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1 rounded-md border bg-background p-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function BedMini({
  label,
  total,
  available,
}: {
  label: string;
  total: number;
  available: number;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-heading text-base font-bold tabular-nums text-foreground">
        {available}
      </div>
      <div className="text-[10px] text-muted-foreground tabular-nums">
        of {total}
      </div>
    </div>
  );
}

function EditHospitalDialog({
  hospital,
  onClose,
  onSaved,
}: {
  hospital: AdminHospital;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(hospital.name);
  const [address, setAddress] = useState(hospital.address);
  const [phoneEmergency, setPhoneEmergency] = useState(hospital.phone_emergency ?? "");
  const [phoneGeneral, setPhoneGeneral] = useState(hospital.phone_general ?? "");
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    // Stand-in for PUT /api/admin/hospitals/{id}. Real impl wires updateHospital.
    setTimeout(() => {
      setSaving(false);
      onSaved();
    }, 400);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <IconPencil className="size-4 text-niramoy-teal" />
          Edit hospital
        </DialogTitle>
        <DialogDescription>
          #{hospital.id} · {hospital.district}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <Field>
          <FieldLabel>Name</FieldLabel>
          <FieldContent>
            <Input className="h-9" value={name} onChange={(e) => setName(e.target.value)} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>Address</FieldLabel>
          <FieldContent>
            <Input className="h-9" value={address} onChange={(e) => setAddress(e.target.value)} />
          </FieldContent>
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field>
            <FieldLabel>Emergency phone</FieldLabel>
            <FieldContent>
              <Input
                className="h-9"
                value={phoneEmergency}
                onChange={(e) => setPhoneEmergency(e.target.value)}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>General phone</FieldLabel>
            <FieldContent>
              <Input
                className="h-9"
                value={phoneGeneral}
                onChange={(e) => setPhoneGeneral(e.target.value)}
              />
            </FieldContent>
          </Field>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={handleSave}
          className="h-8 gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
        >
          {saving ? (
            <IconLoader2 className="size-3.5 animate-spin" />
          ) : (
            <IconArrowRight className="size-3.5" />
          )}
          Save changes
        </Button>
      </DialogFooter>
    </>
  );
}

function AddHospitalDialog({
  onCancel,
  onConfirm,
  loading,
  error,
  fieldErrors,
}: {
  onCancel: () => void;
  onConfirm: (payload: HospitalCreatePayload) => void;
  loading?: boolean;
  error?: string;
  /** Per-field errors from the server (422). Keys are field names. */
  fieldErrors?: { field: string; message: string; code: string }[];
}) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone_emergency: "",
    phone_general: "",
    operator_name: "",
  });
  const [division, setDivision] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [facilityTypes, setFacilityTypes] = useState<("ICU" | "NICU" | "CCU" | "HDU")[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof form | "division" | "district" | "facility_types", string>>
  >({});

  // Districts available under the picked division (empty until one is chosen).
  const districtsForDivision =
    division && (ALL_DIVISIONS as readonly string[]).includes(division)
      ? DIVISION_DISTRICTS[division as keyof typeof DIVISION_DISTRICTS]
      : [];

  // Map server field paths (e.g. "name") onto our local form keys.
  const serverErrors = (fieldErrors ?? []).reduce<
    Record<string, string>
  >((acc, fe) => {
    acc[fe.field] = fe.message;
    return acc;
  }, {});

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function onDivisionChange(v: string) {
    setDivision(v);
    // Reset district — old value may not exist under the new division.
    setDistrict("");
    setErrors((e) => ({ ...e, division: undefined, district: undefined }));
  }

  function onDistrictChange(v: string) {
    setDistrict(v);
    setErrors((e) => ({ ...e, district: undefined }));
  }

  function toggleFacility(value: "ICU" | "NICU" | "CCU" | "HDU") {
    setFacilityTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
    setErrors((e) => ({ ...e, facility_types: undefined }));
  }

  function validate(): boolean {
    const next: Partial<
      Record<keyof typeof form | "division" | "district" | "facility_types", string>
    > = {};
    if (form.name.trim().length < 2) next.name = "At least 2 characters";
    if (!division) next.division = "Select a division";
    if (!district) next.district = "Select a district";
    if (form.address.trim().length < 2) next.address = "At least 2 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    const payload: HospitalCreatePayload = {
      name: form.name.trim(),
      district: district.trim(),
      address: form.address.trim(),
      phone_emergency: form.phone_emergency.trim() || null,
      phone_general: form.phone_general.trim() || null,
      operator_name: form.operator_name.trim() || null,
      facility_types: facilityTypes,
      is_verified: isVerified,
    };
    onConfirm(payload);
  }

  const nameErr = errors.name ?? serverErrors.name;
  const divisionErr = errors.division ?? serverErrors.division;
  const districtErr = errors.district ?? serverErrors.district;
  const addressErr = errors.address ?? serverErrors.address;
  const phoneEmergencyErr = serverErrors.phone_emergency;
  const phoneGeneralErr = serverErrors.phone_general;
  const facilityErr = errors.facility_types ?? serverErrors.facility_types;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <IconPlus className="size-4 text-niramoy-teal" />
          Add hospital
        </DialogTitle>
        <DialogDescription>
          Manually seed a hospital record (used for OSM imports).
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive"
        >
          <IconAlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        <Field>
          <FieldLabel required>Hospital name</FieldLabel>
          <FieldContent>
            <Input
              className="h-9"
              placeholder="e.g. Dhaka Medical College Hospital"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
            <FieldError>{nameErr}</FieldError>
          </FieldContent>
        </Field>

        <div className="grid gap-2 sm:grid-cols-2">
          <Field>
            <FieldLabel required>Division</FieldLabel>
            <FieldContent>
              <Select
                value={division || "_none"}
                onValueChange={(v) => onDivisionChange(v === "_none" ? "" : v)}
                disabled={loading}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {ALL_DIVISIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{divisionErr}</FieldError>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel required>District</FieldLabel>
            <FieldContent>
              <Select
                value={district || "_none"}
                onValueChange={(v) => onDistrictChange(v === "_none" ? "" : v)}
                disabled={loading || !division}
              >
                <SelectTrigger className="h-9">
                  <SelectValue
                    placeholder={
                      division ? "Select district" : "Select a division first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {districtsForDivision.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{districtErr}</FieldError>
            </FieldContent>
          </Field>
        </div>

        <Field>
          <FieldLabel required>Address</FieldLabel>
          <FieldContent>
            <Input
              className="h-9"
              placeholder="Street, area, city"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
            <FieldError>{addressErr}</FieldError>
          </FieldContent>
        </Field>

        <div className="grid gap-2 sm:grid-cols-2">
          <Field>
            <FieldLabel>Emergency phone</FieldLabel>
            <FieldContent>
              <Input
                className="h-9"
                placeholder="e.g. 10655"
                value={form.phone_emergency}
                onChange={(e) => update("phone_emergency", e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
              <FieldError>{phoneEmergencyErr}</FieldError>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>General phone</FieldLabel>
            <FieldContent>
              <Input
                className="h-9"
                placeholder="e.g. +880-2-9668690"
                value={form.phone_general}
                onChange={(e) => update("phone_general", e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
              <FieldError>{phoneGeneralErr}</FieldError>
            </FieldContent>
          </Field>
        </div>

        <Field>
          <FieldLabel>Operator name</FieldLabel>
          <FieldContent>
            <Input
              className="h-9"
              placeholder="e.g. Directorate General of Health Services"
              value={form.operator_name}
              onChange={(e) => update("operator_name", e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Facility types</FieldLabel>
          <FieldContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["ICU", "NICU", "CCU", "HDU"] as const).map((ft) => {
                const checked = facilityTypes.includes(ft);
                return (
                  <label
                    key={ft}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-[11px] uppercase tracking-wider transition-colors ${
                      checked
                        ? "border-niramoy-teal bg-niramoy-teal/5 text-niramoy-teal"
                        : "bg-background text-muted-foreground hover:bg-muted/30"
                    } ${loading ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleFacility(ft)}
                      disabled={loading}
                      aria-label={ft}
                    />
                    <span className="font-semibold">{ft}</span>
                  </label>
                );
              })}
            </div>
            <FieldDescription>
              Select all that apply. Each becomes a HospitalFacility row.
            </FieldDescription>
            <FieldError>{facilityErr}</FieldError>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Verification</FieldLabel>
          <FieldContent>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
              <Checkbox
                checked={isVerified}
                onCheckedChange={(v) => setIsVerified(v === true)}
                disabled={loading}
              />
              <span>Mark as verified immediately on creation</span>
            </label>
          </FieldContent>
        </Field>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={loading}
          onClick={handleSubmit}
          className="h-8 gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
        >
          {loading ? (
            <IconLoader2 className="size-3.5 animate-spin" />
          ) : (
            <IconPlus className="size-3.5" />
          )}
          Create hospital
        </Button>
      </DialogFooter>
    </>
  );
}
