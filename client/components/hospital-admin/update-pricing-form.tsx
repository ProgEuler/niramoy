"use client";

import { useMemo, useState } from "react";
import {
  IconCoin,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToasts } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/use-auth";
import {
  patchMyHospitalPricing,
  type MyHospitalPricing,
  type MyHospitalPricingUpdate,
} from "@/lib/api/hospital-admin";
import {
  myHospitalKeys,
  useMyHospitalHistory,
} from "@/lib/hooks/use-my-hospital";
import { formatTaka, relativeFromNow } from "@/lib/hospital-utils";
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
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

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

  // PATCH /api/hospital/pricing — JWT-scoped to the admin's own hospital.
  const mutation = useMutation<MyHospitalPricing, Error, MyHospitalPricingUpdate>({
    mutationFn: (payload) => {
      if (!accessToken) {
        throw new Error("Not signed in. Please log in again.");
      }
      return patchMyHospitalPricing(payload, { token: accessToken });
    },
    onSuccess: (result) => {
      // Rebase the draft to the new server prices so the diff clears.
      setDraft({
        icu: result.cost_per_day_icu,
        nicu: result.cost_per_day_nicu,
        ccu: result.cost_per_day_ccu,
        hdu: result.cost_per_day_hdu,
      });
      setErrors({});
      // Refresh the dashboard / sidebar / public preview wherever the new
      // prices should appear, and the recent-price-changes panel.
      queryClient.invalidateQueries({ queryKey: myHospitalKeys.all });
      queryClient.invalidateQueries({
        queryKey: myHospitalKeys.history({ update_type: "Pricing" }),
      });
      pushToast({
        title: "Pricing updated",
        description: "New prices are now live for patients.",
        variant: "success",
      });
    },
    onError: (err) => {
      pushToast({
        title: "Couldn't save pricing",
        description: err.message || "Please try again.",
        variant: "error",
      });
    },
  });

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

    // Build the payload with only the changed fields so the backend's
    // "at least one cost field" validator is satisfied and unrelated
    // types don't get re-touched.
    const payload: MyHospitalPricingUpdate = {};
    for (const c of changes) {
      payload[`cost_${c.type}` as keyof MyHospitalPricingUpdate] = c.to;
    }

    mutation.mutate(payload);
  }

  return (
    <div className="space-y-4 max-w-3xl">
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
                      disabled={mutation.isPending}
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
            disabled={changes.length === 0 || mutation.isPending}
            className="h-9 w-full gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
          >
            <IconDeviceFloppy className="size-3.5" />
            {mutation.isPending ? "Saving…" : "Save Pricing"}
          </Button>
        </CardContent>
      </Card>

      <PriceHistory hospital={hospital} />
    </div>
  );
}

function PriceHistory(_: { hospital: Hospital }) {
  // Pull the admin's own pricing history. Defaults to `update_type=Pricing`,
  // `page_size=50` in the hook; after a save we invalidate the matching
  // key so a fresh row appears at the top.
  const { rows, isLoading, isError, error } = useMyHospitalHistory({
    update_type: "Pricing",
    page_size: 50,
  });

  // Map backend `field_name` ("cost_per_day_icu" etc.) to our internal
  // `BedType` so the rows group under the matching card column.
  const fieldToType: Record<string, BedType> = {
    cost_per_day_icu: "icu",
    cost_per_day_nicu: "nicu",
    cost_per_day_ccu: "ccu",
    cost_per_day_hdu: "hdu",
  };

  // Group + cap to the most recent 5 per bed type.
  const grouped = useMemo(() => {
    const out: Record<BedType, PriceChange[]> = {
      icu: [],
      nicu: [],
      ccu: [],
      hdu: [],
    };
    for (const r of rows) {
      const t = r.field_name ? fieldToType[r.field_name] : undefined;
      if (!t) continue;
      const from = Number(r.previous_value);
      const to = Number(r.new_value);
      if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
      out[t].push({
        date: relativeFromNow(r.created_at),
        from,
        to,
        by: "Admin",
      });
      if (out[t].length >= 5) out[t].length = 5;
    }
    return out;
  }, [rows]);

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

        {isLoading ? (
          <p className="text-[11px] text-muted-foreground">
            Loading history…
          </p>
        ) : isError ? (
          <p className="text-[11px] text-destructive">
            {error?.message ?? "Couldn't load price history."}
          </p>
        ) : (
          <div className="space-y-3">
            {ALL_BED_TYPES.map((t) => {
              const items = grouped[t];
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
        )}
      </CardContent>
    </Card>
  );
}
