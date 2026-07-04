"use client";

/**
 * Page-10 Update Bed Counts. Per type:
 *   - Current available count (read-only)
 *   - Total capacity (editable)
 *   - New available count (0 ≤ value ≤ total)
 *
 * Renders a live diff preview ("ICU: 5 → 3 (−2) · NICU: No change") above
 * the submit button, plus an optional note field. On submit, fires a
 * success toast and resets the form.
 *
 * Stays purely client-side. The TODO is to POST to
 *   PATCH /api/hospitals/{id}/beds
 * with `{ beds, note }`.
 */

import { useMemo, useState } from "react";
import {
  IconActivity,
  IconCircleCheck,
  IconCircleMinus,
  IconDeviceFloppy,
  IconNotes,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToasts } from "@/components/ui/toast";
import { ALL_BED_TYPES, type BedType, type Hospital } from "@/lib/types/hospital";
import { cn } from "@/lib/utils";

const LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

interface Props {
  hospital: Hospital;
}

interface Draft {
  total: Record<BedType, number>;
  available: Record<BedType, number>;
}

export function UpdateBedCountsForm({ hospital }: Props) {
  const { pushToast } = useToasts();

  const [draft, setDraft] = useState<Draft>(() => ({
    total: { ...hospital.beds } as unknown as Record<BedType, number>,
    available: {} as Record<BedType, number>,
  }));

  // Each bed type's current available is from the hospital; the new value
  // defaults to current. Initialize `available` to the current available for
  // every type on mount.
  const [baseAvailable, setBaseAvailable] = useState<Record<BedType, number>>(
    () => ({
      icu: hospital.beds.icu.available,
      nicu: hospital.beds.nicu.available,
      ccu: hospital.beds.ccu.available,
      hdu: hospital.beds.hdu.available,
    }),
  );
  const [note, setNote] = useState("");

  // Hydrate draft.available on mount and reset when hospital changes.
  if (Object.keys(draft.available).length === 0) {
    setDraft({
      total: {
        icu: hospital.beds.icu.total,
        nicu: hospital.beds.nicu.total,
        ccu: hospital.beds.ccu.total,
        hdu: hospital.beds.hdu.total,
      },
      available: { ...baseAvailable },
    });
  }

  function setTotal(t: BedType, n: number) {
    const clamped = Math.max(0, Number.isFinite(n) ? n : 0);
    setDraft((d) => {
      const nextAvailable = Math.min(d.available[t] ?? 0, clamped);
      return {
        total: { ...d.total, [t]: clamped },
        available: { ...d.available, [t]: nextAvailable },
      };
    });
  }

  function setAvailable(t: BedType, n: number) {
    const clamped = Math.max(
      0,
      Math.min(Number.isFinite(n) ? n : 0, draft.total[t] ?? 0),
    );
    setDraft((d) => ({ ...d, available: { ...d.available, [t]: clamped } }));
  }

  // Per-type diff.
  const diffs = useMemo(() => {
    return ALL_BED_TYPES.map((t) => {
      const from = baseAvailable[t];
      const to = draft.available[t] ?? from;
      const delta = to - from;
      return { type: t, from, to, delta };
    });
  }, [baseAvailable, draft.available]);

  const changes = diffs.filter((d) => d.delta !== 0);
  const totalChanged = changes.length;
  const totalCapacityChanges = ALL_BED_TYPES.some(
    (t) => draft.total[t] !== hospital.beds[t].total,
  );

  async function handleSubmit() {
    if (totalChanged === 0 && !totalCapacityChanges) {
      pushToast({
        title: "No changes to submit",
        description: "Adjust at least one bed type before saving.",
        variant: "info",
      });
      return;
    }
    // Stand-in for PATCH /api/hospitals/{id}/beds.
    await new Promise((r) => setTimeout(r, 500));

    // Commit: rebase the form to the new values.
    const newBase: Record<BedType, number> = { ...baseAvailable };
    for (const d of diffs) newBase[d.type] = d.to;
    setBaseAvailable(newBase);
    setNote("");

    pushToast({
      title: "Bed counts updated",
      description: "Changes are now live.",
      variant: "success",
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
                <IconActivity className="size-4 text-niramoy-teal" />
                Bed counts
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Available must be between 0 and the total capacity for each
                type. Adjusting capacity affects what patients see in real
                time.
              </p>
            </div>
          </div>

          <ul className="space-y-2">
            {ALL_BED_TYPES.map((t) => {
              const { total, available } = hospital.beds[t];
              const draftTotal = draft.total[t] ?? total;
              const draftAvailable = draft.available[t] ?? available;
              const overCap = draftAvailable > draftTotal;
              const totalChanged = draftTotal !== total;
              return (
                <li
                  key={t}
                  className={cn(
                    "rounded-md border bg-card p-3",
                    (draftAvailable !== available || totalChanged) &&
                      "border-niramoy-teal/40",
                  )}
                >
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="font-heading text-sm font-semibold text-foreground">
                      {LABEL[t]}
                    </span>
                    {overCap && (
                      <span className="text-[10px] font-semibold text-destructive">
                        Available exceeds total
                      </span>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Currently available" readOnly>
                      <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm tabular-nums">
                        {available}
                      </div>
                    </Field>
                    <Field label="Total capacity" hint="Editable">
                      <Input
                        type="number"
                        min={0}
                        className="h-9 tabular-nums"
                        value={Number.isFinite(draftTotal) ? draftTotal : ""}
                        onChange={(e) => setTotal(t, Number(e.target.value))}
                      />
                    </Field>
                    <Field label="New available count">
                      <Input
                        type="number"
                        min={0}
                        max={draftTotal}
                        className="h-9 tabular-nums"
                        value={
                          Number.isFinite(draftAvailable) ? draftAvailable : ""
                        }
                        onChange={(e) =>
                          setAvailable(t, Number(e.target.value))
                        }
                        aria-invalid={overCap}
                      />
                    </Field>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Change summary panel */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Change summary
            </h3>
            <p className="text-[11px] text-muted-foreground">
              What will go live once you save.
            </p>
          </div>

          {totalChanged === 0 && !totalCapacityChanges ? (
            <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              No changes yet. Edit a row above to see a diff.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {diffs.map((d) => (
                <li key={d.type} className="flex items-center gap-2">
                  {d.delta === 0 ? (
                    <IconCircleMinus
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                  ) : (
                    <IconCircleCheck
                      className="size-3.5 text-niramoy-teal"
                      aria-hidden
                    />
                  )}
                  <span className="font-medium text-foreground">
                    {LABEL[d.type]}:
                  </span>
                  {d.delta === 0 ? (
                    <span className="text-muted-foreground">No change</span>
                  ) : (
                    <span className="tabular-nums">
                      <span className="text-muted-foreground">{d.from}</span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="font-semibold text-foreground">
                        {d.to}
                      </span>
                      <span
                        className={cn(
                          "ml-1 font-semibold",
                          d.delta > 0 ? "text-emerald-600" : "text-destructive",
                        )}
                      >
                        ({d.delta > 0 ? "+" : ""}
                        {d.delta})
                      </span>
                    </span>
                  )}
                </li>
              ))}
              {totalCapacityChanges && (
                <li className="mt-1 border-t pt-1 text-[11px] text-muted-foreground">
                  Total capacity changed for{" "}
                  {ALL_BED_TYPES.filter(
                    (t) => draft.total[t] !== hospital.beds[t].total,
                  )
                    .map((t) => LABEL[t])
                    .join(", ")}
                </li>
              )}
            </ul>
          )}

          {/* Note */}
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
            />
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={totalChanged === 0 && !totalCapacityChanges}
            className="h-9 w-full gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
          >
            <IconDeviceFloppy className="size-3.5" />
            Update Bed Counts
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
  readOnly,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-baseline gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {hint && <span className="text-[9px] normal-case">{hint}</span>}
      </label>
      {children}
      {readOnly && (
        <p className="text-[9px] text-muted-foreground">Read-only</p>
      )}
    </div>
  );
}
