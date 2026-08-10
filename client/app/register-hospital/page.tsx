"use client";

/**
 * Step 2 of hospital-admin registration.
 *
 * Requires the user to be logged in (they completed step 1 at /register).
 * If they arrive unauthenticated, we redirect them to /register.
 * If they already have a hospital_id, redirect to /management.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconShieldLock } from "@tabler/icons-react";
import { SiteNavbar } from "@/components/home/site-navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { HospitalProfileForm } from "@/components/registration/hospital-profile-form";
import { useAuth } from "@/lib/auth/use-auth";

export default function RegisterHospitalPage() {
  const router = useRouter();
  const { isAuthed, hydrated, user } = useAuth();

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthed) {
      // Not logged in — send them to step 1.
      router.replace("/register");
      return;
    }

    // Already has a hospital — send to management dashboard.
    if (user?.hospital_id != null) {
      router.replace("/management");
    }
  }, [hydrated, isAuthed, user, router]);

  // Don't render the form until we know the auth state.
  if (!hydrated || !isAuthed) return null;

  return (
    <>
      <SiteNavbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="size-3" />
          Back to home
        </Link>

        <div className="mt-3 mb-6">
          {/* Step indicator */}
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
              1
            </div>
            <span className="text-xs text-muted-foreground">Account</span>
            <div className="mx-1 h-px flex-1 bg-niramoy-teal/40" />
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-niramoy-teal text-[11px] font-bold text-white">
              2
            </div>
            <span className="text-xs font-medium text-foreground">Hospital profile</span>
          </div>

          <p className="inline-flex items-center gap-1 rounded-full bg-niramoy-teal/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-niramoy-teal">
            <IconShieldLock className="size-3" />
            Hospital Registration
          </p>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Register your hospital
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Once approved, your hospital will be listed on Niramoy so patients
            in your district can find available beds.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <HospitalProfileForm />

          <aside className="space-y-3">
            <div className="sticky top-20 space-y-3">
              <div className="rounded-lg border bg-card p-4 text-xs leading-relaxed">
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  What happens next
                </h3>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                  <li>We notify you by email when your application is received.</li>
                  <li>
                    A system admin reviews your application (2–3 business days).
                  </li>
                  <li>
                    Once verified, you can sign in and start updating bed counts.
                  </li>
                </ol>
              </div>

              <div className="rounded-lg border bg-card p-4 text-xs leading-relaxed">
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  Need to sign in instead?
                </h3>
                <p className="mt-1 text-muted-foreground">
                  If your hospital is already registered, use your existing
                  credentials.
                </p>
                <Link
                  href="/login"
                  className="mt-2 inline-block font-medium text-niramoy-teal hover:underline"
                >
                  Go to login →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
