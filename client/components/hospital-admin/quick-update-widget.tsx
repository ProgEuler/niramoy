"use client";

/**
 * Inline quick-update widget. Lets a hospital admin change available counts
 * without leaving the dashboard. Validates each input (must be ≤ total).
 */

import { useState } from "react";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ALL_BED_TYPES } from "@/lib/types/hospital";
import type { BedType, Hospital } from "@/lib/types/hospital";
import { cn } from "@/lib/utils";

interface Props {
  hospital: Hospital;
}

const LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

export function QuickUpdateWidget({ hospital }: Props) {
  const [draft, setDraft] = useState<Record<BedType, number>>({
    icu: hospital.beds.icu.available,
    nicu: hospital.beds.nicu.available,
    ccu: hospital.beds.ccu.available,
    hdu: hospital.beds.hdu.available,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setField(t: BedType, n: number) {
    setDraft((d) => ({ ...d, [t]: n }));
    setSaved(false);
  }

  function clamp(n: number, total: number): number {
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(total, n));
  }

  async function handleSave() {
    setSaving(true);
    // Stand-in for PATCH /api/hospitals/{id}/beds. Real impl would POST the
    // diff and re-render the dashboard from the response.
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
  }

  const dirty = ALL_BED_TYPES.some(
    (t) => draft[t] !== hospital.beds[t].available,
  );

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Quick update
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Change available counts without leaving the dashboard.
            </p>
          </div>
          {saved && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              Saved
            </span>
          )}
        </div>

        <ul className="space-y-1.5">
          {ALL_BED_TYPES.map((t) => {
            const { total, available } = hospital.beds[t];
            const draftVal = draft[t];
            const overCap = draftVal > total;
            const changed = draftVal !== available;
            return (
              <li
                key={t}
                className={cn(
                  "flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-xs",
                  changed && "border-niramoy-teal/40 bg-niramoy-teal/5",
                )}
              >
                <span className="w-12 shrink-0 font-heading text-xs font-semibold text-foreground">
                  {LABEL[t]}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                  {available}/{total}
                </span>
                <Input
                  type="number"
                  min={0}
                  max={total}
                  value={Number.isFinite(draftVal) ? draftVal : ""}
                  onChange={(e) =>
                    setField(t, clamp(Number(e.target.value), total))
                  }
                  className="h-7 w-20 text-right tabular-nums"
                  disabled={total === 0}
                />
                {overCap && (
                  <span className="text-[10px] text-destructive">
                    exceeds total
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <Button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="h-8 w-full gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
        >
          <IconDeviceFloppy className="size-3.5" />
          {saving ? "Saving…" : "Save All"}
        </Button>
      </CardContent>
    </Card>
  );
}
