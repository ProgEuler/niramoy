"use client";

/**
 * Page-11 Update Pricing. Per type:
 *   - Current price (read-only)
 *   - New price (must be > ৳0)
 *
 * Includes a "last 5 pricing changes per bed type" history table.
 */

import { useMemo, useState } from "react";
import {
  IconCoin,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToasts } from "@/components/ui/toast";
import { formatTaka } from "@/lib/hospital-utils";
import { ALL_BED_TYPES, type BedType, type Hospital } from "@/lib/types/hospital";

const LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

interface Props {
  hospital: Hospital;
}

interface PriceChange {
  date: string;
  from: number;
  to: number;
  by: string;
}

export function UpdatePricingForm({ hospital }: Props) {
  const { pushToast } = useToasts();
  const [draft, setDraft] = useState<Record<BedType, number>>(() => ({
    icu: hospital.price.icu,
    nicu: hospital.price.nicu,
    ccu: hospital.price.ccu,
    hdu: hospital.price.hdu,
  }));
  const [errors, setErrors] = useState<Partial<Record<BedType, string>>>({});

  const changes = useMemo(
    () =>
      ALL_BED_TYPES.map((t) => ({
        type: t,
        from: hospital.price[t],
        to: draft[t],
      })).filter((c) => c.from !== c.to),
    [draft, hospital.price],
  );

  function setPrice(t: BedType, raw: string) {
    const n = Number(raw);
    setDraft((d) => ({ ...d, [t]: Number.isFinite(n) ? n : 0 }));
    if (n <= 0) {
      setErrors((e) => ({ ...e, [t]: "Price must be greater than ৳0" }));
    } else {
      setErrors((e) => {
        const { [t]: _omit, ...rest } = e;
        return rest;
      });
    }
  }

  async function handleSubmit() {
    // Re-validate before submit.
    const next: typeof errors = {};
    for (const t of ALL_BED_TYPES) {
      if (draft[t] <= 0) next[t] = "Price must be greater than ৳0";
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      pushToast({
        title: "Fix the errors above",
        description: "All prices must be greater than zero.",
        variant: "error",
      });
      return;
    }
    if (changes.length === 0) {
      pushToast({
        title: "No changes to submit",
        variant: "info",
      });
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
    pushToast({
      title: "Pricing updated",
      description: "New prices are now live for patients.",
      variant: "success",
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
              <IconCoin className="size-4 text-niramoy-teal" />
              Pricing
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Set the cost per day in BDT for each bed type. Public hospitals
              typically set ৳0 (free).
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {ALL_BED_TYPES.map((t) => {
              const current = hospital.price[t];
              const draftVal = draft[t];
              const dirty = draftVal !== current;
              return (
                <li
                  key={t}
                  className="rounded-md border bg-card p-3"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-heading text-sm font-semibold text-foreground">
                      {LABEL[t]}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      BDT / day
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1.5 text-xs text-muted-foreground">
                    Current:
                    <span className="tabular-nums font-medium text-foreground">
                      {current === 0 ? "Free" : formatTaka(current)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">৳</span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      className="h-9 tabular-nums"
                      value={Number.isFinite(draftVal) ? draftVal : ""}
                      onChange={(e) => setPrice(t, e.target.value)}
                      aria-invalid={Boolean(errors[t])}
                    />
                  </div>
                  {errors[t] && (
                    <p className="mt-1 text-[10px] text-destructive">
                      {errors[t]}
                    </p>
                  )}
                  {dirty && !errors[t] && (
                    <p className="mt-1 text-[10px] text-niramoy-teal">
                      Will change to {formatTaka(draftVal)}/day
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={changes.length === 0}
            className="h-9 w-full gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
          >
            <IconDeviceFloppy className="size-3.5" />
            Save Pricing
          </Button>
        </CardContent>
      </Card>

      <PriceHistory hospital={hospital} />
    </div>
  );
}

function PriceHistory({ hospital }: { hospital: Hospital }) {
  // Deterministic seed → same history per hospital. Same convention as the
  // recent-update-log on the dashboard.
  const history = useMemo(() => seedHistory(hospital), [hospital]);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Recent price changes
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Last 5 pricing changes per bed type.
          </p>
        </div>

        <div className="space-y-3">
          {ALL_BED_TYPES.map((t) => {
            const items = history[t];
            return (
              <div key={t}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {LABEL[t]}
                </div>
                {items.length === 0 ? (
                  <p className="mt-1 text-[11px] italic text-muted-foreground">
                    No price changes recorded.
                  </p>
                ) : (
                  <ul className="mt-1 divide-y rounded-md border bg-card text-xs">
                    {items.map((c, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 px-3 py-1.5"
                      >
                        <span className="text-muted-foreground tabular-nums">
                          {c.date}
                        </span>
                        <span className="tabular-nums">
                          <span className="text-muted-foreground line-through">
                            {formatTaka(c.from)}
                          </span>
                          <span className="mx-1 text-muted-foreground">→</span>
                          <span className="font-semibold text-foreground">
                            {formatTaka(c.to)}
                          </span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          by {c.by}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function seedHistory(hospital: Hospital): Record<BedType, PriceChange[]> {
  let h = 0;
  for (let i = 0; i < hospital.id.length; i += 1) {
    h = (h ^ hospital.id.charCodeAt(i) * 2654435761) >>> 0;
  }
  const dates = ["3 d ago", "1 wk ago", "2 wk ago", "3 wk ago", "1 mo ago"];
  const out = {} as Record<BedType, PriceChange[]>;
  for (const t of ALL_BED_TYPES) {
    const base = hospital.price[t];
    out[t] = dates.map((d, i) => ({
      date: d,
      from: Math.max(0, base - 1000 - ((h >> (i * 3)) & 7) * 500),
      to: base,
      by: "Admin",
    }));
  }
  return out;
}
