"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { SiteNavbar } from "@/components/home/site-navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { Disclaimer } from "@/components/find-care/disclaimer";
import { HospitalHeader } from "@/components/hospital-detail/hospital-header";
import { BedAvailabilityPanel } from "@/components/hospital-detail/bed-availability-panel";
import { HospitalInfoSection } from "@/components/hospital-detail/hospital-info-section";
import { AvailabilityHistoryChart } from "@/components/hospital-detail/availability-history-chart";
import { ReviewsSection } from "@/components/hospital-detail/reviews-section";
import { RelatedHospitals } from "@/components/hospital-detail/related-hospitals";
import { useHospitalDetail } from "@/lib/hooks/use-hospital-detail";
import type { Hospital } from "@/lib/types/hospital";

const COMPARE_KEY = "niramoy:compareIds";

export default function HospitalDetailPage() {
  const params = useParams<{ id: string }>();
  const slug = params?.id;
  const { hospital, isLoading, isError } = useHospitalDetail(slug);

  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Hydrate compare selection from sessionStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(COMPARE_KEY);
      if (raw) setCompareIds(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(COMPARE_KEY, JSON.stringify(compareIds));
    } catch {
      /* ignore */
    }
  }, [compareIds]);

  if (isLoading) {
    return (
      <>
        <SiteNavbar />
        <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="text-sm text-muted-foreground">Loading hospital…</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (isError || !hospital) {
    return (
      <>
        <SiteNavbar />
        <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
          <h1 className="font-heading text-2xl font-semibold">
            Hospital not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn’t find a hospital with the id{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {slug}
            </code>
            . It may have been removed or the link is incorrect.
          </p>
          <div className="mt-6">
            <Button asChild size="sm">
              <Link href="/find-care">
                <IconArrowLeft className="size-3.5" />
                Back to search
              </Link>
            </Button>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const inCompare = compareIds.includes(hospital.id);

  function toggleCompare() {
    setCompareIds((prev) => {
      if (prev.includes(hospital!.id)) {
        return prev.filter((x) => x !== hospital!.id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, hospital!.id];
    });
  }

  return (
    <>
      <SiteNavbar />
      <main className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
        <HospitalHeader
          hospital={hospital}
          inCompare={inCompare}
          onToggleCompare={toggleCompare}
        />

        <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
          <BedAvailabilityPanel hospital={hospital} />
          <HospitalInfoSection hospital={hospital} />
          <AvailabilityHistoryChart hospital={hospital} />
          {/* <ReviewsSection hospital={hospital} /> */}
          {/* <RelatedHospitals hospital={hospital} /> */}
          <Disclaimer />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
