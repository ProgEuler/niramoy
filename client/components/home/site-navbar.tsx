"use client"

import Link from "next/link"
import { useState } from "react"
import {
  IconLanguage,
  IconMenu2,
  IconStethoscope,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map View" },
  { href: "/about", label: "About" },
] as const

export function SiteNavbar() {
  const [language, setLanguage] = useState<"en" | "bn">("en")
  const [mobileOpen, setMobileOpen] = useState(false)

  const tagline =
    language === "en" ? "Find critical care beds" : "জরুরি বেড খুঁজুন"

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Logo + tagline */}
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Niramoy home"
        >
         {/* <LogoIcon /> */}
          <span className="flex flex-col leading-none">
            <span className="font-heading text-base font-semibold text-foreground">
              Niramoy
            </span>
            <span className="text-[10px] text-muted-foreground">{tagline}</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Language toggle"
            className="hidden items-center rounded-md border bg-input/20 p-0.5 text-[11px] font-medium sm:flex"
          >
            <button
              type="button"
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
              className={cn(
                "rounded-sm px-2 py-1 transition-colors",
                language === "en"
                  ? "bg-niramoy-teal text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage("bn")}
              aria-pressed={language === "bn"}
              className={cn(
                "rounded-sm px-2 py-1 transition-colors",
                language === "bn"
                  ? "bg-niramoy-teal text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              বাংলা
            </button>
            <IconLanguage className="mr-1 ml-0.5 size-3.5 text-muted-foreground" />
          </div>

          <Button
            asChild
            size="sm"
            className="bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
          >
            <Link href="/login">Login</Link>
          </Button>

          {/* Mobile menu toggle */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <IconX className="size-4" />
            ) : (
              <IconMenu2 className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav aria-label="Mobile" className="border-t bg-background md:hidden">
          <ul className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-1 border-t pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Language
                </span>
                <div
                  role="group"
                  aria-label="Language toggle"
                  className="flex items-center rounded-md border bg-input/20 p-0.5 text-[11px]"
                >
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    aria-pressed={language === "en"}
                    className={cn(
                      "rounded-sm px-2 py-1",
                      language === "en"
                        ? "bg-niramoy-teal text-white"
                        : "text-muted-foreground"
                    )}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("bn")}
                    aria-pressed={language === "bn"}
                    className={cn(
                      "rounded-sm px-2 py-1",
                      language === "bn"
                        ? "bg-niramoy-teal text-white"
                        : "text-muted-foreground"
                    )}
                  >
                    বাংলা
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
