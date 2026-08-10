"use client";

/**
 * Shown to hospital admins who are logged in but whose hospital has not yet
 * been verified by a system admin.
 *
 * Two cases:
 *   1. hospital_id is null  — they never submitted a hospital profile. Send
 *      them to /register-hospital to complete step 2.
 *   2. hospital_is_verified is false — profile submitted but not yet approved.
 *      Show the waiting screen.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconBuildingHospital,
  IconClock,
  IconLogout,
  IconRefresh,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteNavbar } from "@/components/home/site-navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { useAuth } from "@/lib/auth/use-auth";
import { useCurrentUser } from "@/lib/auth/hooks";

export default function PendingApprovalPage() {
  const router = useRouter();
  const { isAuthed, hydrated, user, signOut } = useAuth();
  const meQuery = useCurrentUser();

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthed) {
      router.replace("/login");
      return;
    }

    if (user?.role !== "hospital_admin") {
      // Non-hospital-admin roles shouldn't land here.
      router.replace("/");
      return;
    }

    // No hospital submitted yet — redirect to complete registration.
    if (user?.hospital_id == null) {
      router.replace("/register-hospital");
      return;
    }

    // Hospital is verified — let them through to the dashboard.
    if (user?.hospital_is_verified === true) {
      router.replace("/management");
    }
  }, [hydrated, isAuthed, user, router]);

  function handleRefresh() {
    meQuery.refetch();
  }

  function handleSignOut() {
    signOut();
    router.replace("/login");
  }

  if (!hydrated || !isAuthed) return null;

  return (
    <>
      <SiteNavbar />
      <main className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="space-y-4 p-8 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <IconClock className="size-7" />
              </span>

              <div>
                <h1 className="font-heading text-2xl font-semibold text-foreground">
                  Awaiting approval
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your hospital profile has been submitted and is under review by
                  our team. This typically takes 2–3 business days.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-4 text-left text-xs text-muted-foreground">
                <p className="font-medium text-foreground">What happens next</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>
                    A system admin will verify your hospital's details.
                  </li>
                  <li>
                    You'll receive an email notification once approved.
                  </li>
                  <li>
                    After approval you can sign in and start updating bed
                    counts.
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleRefresh}
                  disabled={meQuery.isFetching}
                >
                  <IconRefresh
                    className={`size-4 ${meQuery.isFetching ? "animate-spin" : ""}`}
                  />
                  {meQuery.isFetching ? "Checking…" : "Check status"}
                </Button>

                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href="/">
                    <IconBuildingHospital className="size-4" />
                    Back to home
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={handleSignOut}
                >
                  <IconLogout className="size-4" />
                  Sign out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
