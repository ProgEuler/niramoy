"use client";

/**
 * Sticky bottom bar that appears when 2+ hospitals are selected for
 * comparison. Shows the selected names as removable pills plus a
 * "Compare Now" button that routes to the compare page.
 *
 * Stays out of the way of the page footer by collapsing to icon-only on
 * narrow viewports; pills truncate with ellipsis rather than wrap.
 */

import Link from "next/link";
import { IconArrowsHorizontal, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useHospitalStore } from "@/lib/use-hospital-store";
import { MAX_COMPARE } from "@/app/app/find-care/filters";

interface Props {
  compareIds: string[];
  onRemove: (id: string) => void;
}

export function CompareBar({ compareIds, onRemove }: Props) {
  const { hospitals } = useHospitalStore();
  if (compareIds.length < 2) return null;

  const selected = compareIds
    .map((id) => hospitals.find((h) => h.id === id))
    .filter((h): h is NonNullable<typeof h> => Boolean(h));

  const compareHref = `/compare?ids=${compareIds.join(",")}`;

  return (
    <div
      role="region"
      aria-label="Compare hospitals"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 shadow-[0_-8px_20px_-12px_rgba(0,0,0,0.15)] backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6">
        <span className="hidden text-xs font-semibold text-foreground sm:inline">
          Compare {selected.length}/{MAX_COMPARE}
        </span>
        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {selected.map((h) => (
            <li
              key={h.id}
              className="inline-flex max-w-[200px] items-center gap-1 rounded-full border bg-muted/50 py-0.5 pl-2.5 pr-1 text-[11px] font-medium"
            >
              <span className="truncate">{h.name}</span>
              <button
                type="button"
                onClick={() => onRemove(h.id)}
                aria-label={`Remove ${h.name} from comparison`}
                className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <IconX className="size-2.5" />
              </button>
            </li>
          ))}
        </ul>
        <Button
          asChild
          size="sm"
          className="h-7 gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
        >
          <Link href={compareHref}>
            <IconArrowsHorizontal className="size-3.5" />
            Compare Now
          </Link>
        </Button>
      </div>
    </div>
  );
}
