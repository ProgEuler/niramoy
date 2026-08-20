"use client";

import { useMemo, useState } from "react";
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowBack,
  IconCircleCheck,
  IconCircleMinus,
  IconDeviceFloppy,
  IconMinus,
  IconNotes,
  IconPlus,
  IconRefresh,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToasts } from "@/components/ui/toast";
import {
  patchMyHospitalBeds,
  type MyHospitalBedsUpdate,
  type MyHospitalBedsUpdateResult,
} from "@/lib/api/hospital-admin";
import { myHospitalKeys } from "@/lib/hooks/use-my-hospital";
import { useAuth } from "@/lib/auth/use-auth";
import { ALL_BED_TYPES, type BedType, type Hospital } from "@/lib/types/hospital";
import { cn } from "@/lib/utils";

const LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

const FULL_NAME: Record<BedType, string> = {
  icu: "Intensive Care Unit",
  nicu: "Neonatal ICU",
  ccu: "Coronary Care Unit",
  hdu: "High Dependency Unit",
};

interface Props {
  hospital: Hospital;
}

/**
 * Per-bed-type draft state. Only `available` is editable on this page;
 * `total` mirrors the current server value so the form can keep showing
 * the read-only capacity context and the diff color.
 */
interface Draft {
  available: Record<BedType, number>;
}

export function UpdateBedCountsForm({ hospital }: Props) {
  const { pushToast } = useToasts();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  // The "before" snapshot the user is editing against. Rebased on submit
  // so the form always diffs against the last-saved state on the server.
  const [baseAvailable, setBaseAvailable] = useState<Record<BedType, number>>(
    () => ({
      icu: hospital.beds.icu.available,
      nicu: hospital.beds.nicu.available,
      ccu: hospital.beds.ccu.available,
      hdu: hospital.beds.hdu.available,
    }),
  );
  const [note, setNote] = useState("");

  // Hydrate draft on mount and reset on hospital change.
  const [draft, setDraft] = useState<Draft>(() => ({
    available: { ...baseAvailable },
  }));

  function setAvailable(t: BedType, n: number) {
    const total = hospital.beds[t].total;
    const clamped = Math.max(
      0,
      Math.min(Number.isFinite(n) ? n : 0, total),
    );
    setDraft((d) => ({ available: { ...d.available, [t]: clamped } }));
  }

  function resetRow(t: BedType) {
    setDraft((d) => ({
      available: { ...d.available, [t]: baseAvailable[t] },
    }));
  }

  function markAllEmpty() {
    setDraft((d) => {
      const next: Record<BedType, number> = { ...d.available };
      for (const t of ALL_BED_TYPES) next[t] = 0;
      return { available: next };
    });
  }

  function markAllFull() {
    setDraft((d) => {
      const next: Record<BedType, number> = { ...d.available };
      for (const t of ALL_BED_TYPES) next[t] = hospital.beds[t].total;
      return { available: next };
    });
  }

  function resetAll() {
    setDraft({ available: { ...baseAvailable } });
  }

  // Per-type diff (reused for the submit-button disabled state).
  const diffs = useMemo(() => {
    return ALL_BED_TYPES.map((t) => {
      const from = baseAvailable[t];
      const to = draft.available[t] ?? from;
      const delta = to - from;
      return { type: t, from, to, delta };
    });
  }, [baseAvailable, draft.available]);

  const availableChanges = diffs.filter((d) => d.delta !== 0);
  const hasChanges = availableChanges.length > 0;

  // Bulk-action enable states. Buttons should feel "pressable" only when
  // they'd actually do something — disable when already in that state.
  const allAvailableZero = ALL_BED_TYPES.every(
    (t) => (draft.available[t] ?? 0) === 0,
  );
  const allAvailableFull = ALL_BED_TYPES.every(
    (t) => (draft.available[t] ?? 0) === hospital.beds[t].total,
  );

  // Mutation — single PATCH with only the *changed* available fields.
  const mutation = useMutation<MyHospitalBedsUpdateResult, Error, MyHospitalBedsUpdate>({
    mutationFn: (payload) => {
      if (!accessToken) {
        // Should be unreachable: the page is behind the auth guard.
        // Throw a typed error so the user sees the same destructive toast
        // path as any other failure.
        throw new Error("Not signed in. Please log in again.");
      }
      return patchMyHospitalBeds(payload, { token: accessToken });
    },
    onSuccess: (result) => {
      // Commit the draft to the new base so the diff clears.
      const newBase: Record<BedType, number> = { ...baseAvailable };
      for (const d of diffs) newBase[d.type] = d.to;
      setBaseAvailable(newBase);
      setDraft({ available: { ...newBase } });
      setNote("");

      // Refresh the dashboard / sidebar wherever the admin is monitoring
      // their own hospital — the new available counts are live now.
      queryClient.invalidateQueries({ queryKey: myHospitalKeys.all });

      if (result.status === "pending") {
        pushToast({
          title: "Update queued for review",
          description:
            "The drop is large enough to require platform admin approval. Patients will see the change once approved.",
          variant: "info",
        });
      } else {
        pushToast({
          title: "Bed counts updated",
          description: "Changes are now live.",
          variant: "success",
        });
      }
    },
    onError: (err) => {
      pushToast({
        title: "Couldn't save bed counts",
        description: err.message || "Please try again.",
        variant: "error",
      });
    },
  });

  async function handleSubmit() {
    if (!hasChanges) {
      pushToast({
        title: "No changes to submit",
        description: "Adjust at least one bed type before saving.",
        variant: "info",
      });
      return;
    }

    // Build the payload with only the changed fields so the backend's
    // "at least one value" validator is satisfied and unrelated types
    // don't get re-touched.
    const payload: MyHospitalBedsUpdate = { note: note.trim() || undefined };
    for (const d of diffs) {
      if (d.delta !== 0) {
        payload[`${d.type}_available`] = d.to;
      }
    }

    mutation.mutate(payload);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
              <IconActivity className="size-4 text-niramoy-teal" />
              Bed counts
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Available must be between 0 and the total capacity for each
              type. Adjusted counts go live instantly; large drops are
              queued for moderation.
            </p>
          </div>

          {/* Bulk actions */}
          <div
            className="flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/20 p-2"
            role="toolbar"
            aria-label="Bulk actions"
          >
            <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Bulk
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={markAllEmpty}
              disabled={allAvailableZero}
              className="h-7 gap-1 text-[11px]"
            >
              <IconCircleMinus className="size-3" />
              Mark all empty
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={markAllFull}
              disabled={allAvailableFull}
              className="h-7 gap-1 text-[11px]"
            >
              <IconCircleCheck className="size-3" />
              Mark all full
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetAll}
              disabled={!hasChanges}
              className="h-7 gap-1 text-[11px] text-muted-foreground"
            >
              <IconRefresh className="size-3" />
              Reset to current
            </Button>
          </div>

          {/* Per-bed-type rows */}
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ALL_BED_TYPES.map((t) => {
              const { total, available } = hospital.beds[t];
              const draftAvailable = draft.available[t] ?? available;
              const from = baseAvailable[t];
              const delta = draftAvailable - from;
              const dirty = delta !== 0;
              const overCap = draftAvailable > total;
              const freePct =
                total > 0
                  ? Math.round((draftAvailable / total) * 100)
                  : 0;
              const fillPct = 100 - freePct;
              const pillTone = pillToneFor(fillPct, total);

              return (
                <li
                  key={t}
                  className={cn(
                    "rounded-lg border bg-card p-3 transition-colors",
                    dirty
                      ? "border-niramoy-teal/40 ring-1 ring-niramoy-teal/20"
                      : "border-border",
                  )}
                >
                  {/* Header strip: label + capacity + free/total pill */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm font-semibold text-foreground">
                          {LABEL[t]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          · {FULL_NAME[t]}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Capacity: {total} beds
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                        pillTone,
                      )}
                      title={`${draftAvailable} of ${total} beds free`}
                    >
                      {draftAvailable}/{total} free
                      {total > 0 && (
                        <span className="opacity-70">· {freePct}%</span>
                      )}
                    </span>
                  </div>

                  {/* Editor row: a single stepper for "New available" */}
                  <Field label="New available count">
                    <NumberStepper
                      value={draftAvailable}
                      min={0}
                      max={total}
                      invalid={overCap}
                      onChange={(n) => setAvailable(t, n)}
                      disabled={mutation.isPending}
                    />
                  </Field>

                  {/* Diff footer: only when dirty */}
                  <div className="mt-2.5" aria-live="polite">
                    {dirty ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-niramoy-teal/5 px-2.5 py-1.5 text-xs">
                        <div className="flex items-center gap-1.5 tabular-nums">
                          <span className="text-muted-foreground line-through">
                            {from}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-semibold text-foreground">
                            {draftAvailable}
                          </span>
                          <span
                            className={cn(
                              "ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                              delta > 0
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "bg-destructive/10 text-destructive",
                            )}
                          >
                            {delta > 0 ? "+" : ""}
                            {delta}
                          </span>
                          {overCap && (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-destructive">
                              <IconAlertTriangle className="size-3" />
                              exceeds total
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => resetRow(t)}
                          disabled={mutation.isPending}
                          className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-40"
                        >
                          <IconArrowBack className="size-2.5" />
                          Discard
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        No change · currently {available} of {total} free.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Save card */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1.5">
            <label
              htmlFor="note"
              className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              <IconNotes className="size-3" />
              Note (optional)
            </label>
            <Input
              id="note"
              placeholder="e.g. Ward closed for maintenance"
              className="h-9"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={mutation.isPending}
            />
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!hasChanges || mutation.isPending}
            className="h-9 w-full gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
          >
            <IconDeviceFloppy className="size-3.5" />
            {mutation.isPending ? "Saving…" : "Update Bed Counts"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-baseline gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {hint && <span className="text-[9px] normal-case">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/** Tailwind classes for the free/total pill based on % free. */
function pillToneFor(fillPct: number, total: number): string {
  if (total === 0) {
    return "bg-muted text-muted-foreground";
  }
  if (fillPct >= 90) {
    // ≥ 90% occupied → red
    return "bg-destructive/10 text-destructive";
  }
  if (fillPct >= 50) {
    // 50–90% occupied → amber
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
  // < 50% occupied → green
  return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
}

/**
 * Number input with built-in +/- stepper buttons. The +/- buttons are
 * disabled at the bounds so the user can see at a glance that the value
 * can't go lower or higher. The input itself still accepts typed values
 * so edge cases (typed zero, copy-paste) keep working.
 */
function NumberStepper({
  value,
  min,
  max,
  step = 1,
  invalid,
  disabled,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  const atMin = typeof min === "number" && value <= min;
  const atMax = typeof max === "number" && value >= max;
  const clamp = (n: number) => {
    let v = Number.isFinite(n) ? n : 0;
    if (typeof min === "number") v = Math.max(min, v);
    if (typeof max === "number") v = Math.min(max, v);
    return v;
  };

  return (
    <div
      className={cn(
        "flex h-9 items-stretch overflow-hidden rounded-md border bg-input/20 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
        invalid && "border-destructive ring-2 ring-destructive/20",
        disabled && "opacity-60",
      )}
    >
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(clamp(value - step))}
        disabled={atMin || disabled}
        className="flex w-9 shrink-0 items-center justify-center border-r text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <IconMinus className="size-3.5" />
      </button>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        aria-invalid={invalid}
        disabled={disabled}
        className="h-full flex-1 rounded-none border-0 bg-transparent text-center tabular-nums focus-visible:border-0 focus-visible:ring-0 disabled:opacity-100"
      />
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(clamp(value + step))}
        disabled={atMax || disabled}
        className="flex w-9 shrink-0 items-center justify-center border-l text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <IconPlus className="size-3.5" />
      </button>
    </div>
  );
}
