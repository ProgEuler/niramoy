"use client";

/**
 * PAGE 8 — Hospital Registration (public, but only Hospital Admins use it).
 *
 * Two columns on desktop: form on the left, sidebar with what-happens-next
 * notes on the right. Mobile stacks vertically. After submit, the form
 * transitions into the post-submit status banner.
 */

import Link from "next/link";
import { IconArrowLeft, IconShieldLock } from "@tabler/icons-react";
import { SiteNavbar } from "@/components/home/site-navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { RegistrationForm } from "@/components/registration/registration-form";

export default function RegisterHospitalPage() {
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
          <RegistrationForm />

          <aside className="space-y-3">
            <div className="sticky top-20 space-y-3">
              <div className="rounded-lg border bg-card p-4 text-xs leading-relaxed">
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  What happens next
                </h3>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                  <li>
                    We email you a confirmation within minutes.
                  </li>
                  <li>
                    A system admin reviews your application (2–3 business
                    days).
                  </li>
                  <li>
                    Once verified, you can sign in and start updating bed
                    counts.
                  </li>
                </ol>
              </div>

              <div className="rounded-lg border bg-card p-4 text-xs leading-relaxed">
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  Already registered?
                </h3>
                <p className="mt-1 text-muted-foreground">
                  Sign in with the email you registered.
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
