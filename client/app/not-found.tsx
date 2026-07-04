"use client"

import Link from "next/link"
import {
  IconArrowLeft,
} from "@tabler/icons-react"
import { SiteNavbar } from "@/components/home/site-navbar"
import { SiteFooter } from "@/components/home/site-footer"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <>
      <SiteNavbar />
      <main className="flex flex-col">
        <section
          aria-labelledby="nf-heading"
          className="relative isolate overflow-hidden bg-gradient-to-b from-niramoy-teal/5 via-background to-background min-h-screen"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-24 -z-10 mx-auto h-64 max-w-3xl rounded-full bg-niramoy-teal/10 blur-3xl"
          />
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6 sm:py-20">
            <span
              aria-hidden
              className="font-heading text-7xl font-semibold tracking-tight text-niramoy-teal/30 sm:text-8xl"
            >
              404
            </span>

            <div>
              <p className="text-xs font-semibold tracking-wider text-niramoy-teal uppercase">
                Page not found
              </p>
              <h1
                id="nf-heading"
                className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
              >
                We could not find that page.
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                The page you were looking for may have moved, been renamed, or
                never existed. If you arrived here from a link on the site,
                please let us know so we can fix it.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="sm"
                className="bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
              >
                <Link href="/">
                  <IconArrowLeft className="mr-1.5 size-4" />
                  Back to home
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
