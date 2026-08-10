"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBuildingHospital,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconLoader2,
  IconPhone,
  IconShieldCheck,
  IconShieldCog,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminHospitals, useVerifyHospital } from "@/lib/hooks/use-admin";

const PAGE_SIZE = 20;

export default function PendingApprovalPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useAdminHospitals({
    is_verified: false,
    is_active: true,
    page,
    page_size: PAGE_SIZE,
  });

  const verify = useVerifyHospital();

  const hospitals = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;
  const totalCount = data?.total_count ?? 0;

  return (
    <>

      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-xs text-muted-foreground">
            <IconLoader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : hospitals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <IconShieldCheck className="size-6" />
              </span>
              <p className="text-sm font-medium text-foreground">All clear</p>
              <p className="text-xs text-muted-foreground">
                No hospitals are waiting for review right now.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {isFetching && !isLoading && (
              <p className="text-[11px] text-muted-foreground">Refreshing…</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hospitals.map((h) => (
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

                    {/* Details */}
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <p className="line-clamp-2">{h.address}</p>
                      {h.phone_emergency && (
                        <p className="flex items-center gap-1">
                          <IconPhone className="size-3 shrink-0" />
                          <a
                            href={`tel:${h.phone_emergency}`}
                            className="text-niramoy-teal hover:underline"
                          >
                            {h.phone_emergency}
                          </a>
                        </p>
                      )}
                      <p className="text-[10px]">
                        Registered{" "}
                        {new Date(h.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Bed summary */}
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

                    {/* Actions */}
                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
                        disabled={verify.isPending}
                        onClick={() =>
                          verify.mutate({ id: h.id, is_verified: true })
                        }
                      >
                        {verify.isPending ? (
                          <IconLoader2 className="size-3.5 animate-spin" />
                        ) : (
                          <IconShieldCheck className="size-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <Link href={`/hospital/${h.id}`}>
                          View
                          <IconArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
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
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <IconChevronLeft className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <IconChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
