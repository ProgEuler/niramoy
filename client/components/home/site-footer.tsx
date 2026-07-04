"use client";

import Link from "next/link";
import { IconStethoscope } from "@tabler/icons-react";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/contact", label: "Contact" },
  {
    href: "https://dghs.gov.bd",
    label: "DGHS Reference",
    external: true,
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          {/* Brand + disclaimer */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-niramoy-teal text-white">
                <IconStethoscope className="size-4" />
              </span>
              <span className="font-heading text-sm font-semibold">Niramoy</span>
            </Link>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Real-time ICU, NICU, CCU and HDU bed availability across
              hospitals in Bangladesh.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Platform
            </h3>
            <ul className="mt-3 space-y-2">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  {"external" in l && l.external ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs text-foreground/80 hover:text-niramoy-teal hover:underline"
                    >
                      {l.label} ↗
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-xs text-foreground/80 hover:text-niramoy-teal hover:underline"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Data acknowledgement */}
          <div>
            <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Data acknowledgement
            </h3>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Hospital listings are seeded from the{" "}
              <a
                href="https://dghs.gov.bd"
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-foreground/80 underline-offset-2 hover:text-niramoy-teal hover:underline"
              >
                Directorate General of Health Services (DGHS)
              </a>{" "}
              public registry. Bed availability is self-reported by each
              hospital and is updated manually.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-[11px] text-muted-foreground">
          <span>© {new Date().getFullYear()} Niramoy. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
