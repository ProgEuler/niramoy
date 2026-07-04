"use client";

/**
 * The data-honesty disclaimer required by AGENTS.md on every public page.
 * Render exactly as written — every word counts.
 */

export function Disclaimer() {
  return (
    <p className="border-t pt-2 text-[11px] leading-relaxed text-muted-foreground">
      Bed counts are self-reported by hospital staff. Always call to confirm
      before traveling.
    </p>
  );
}