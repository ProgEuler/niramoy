"use client";

/**
 * Pure-React calendar (no `react-day-picker` dep).
 *
 * Supports `single` and `range` selection across one or two months.
 * Keyboard: ←/→ move focus by day, ↑/↓ by week, PgUp/PgDn by month,
 * Home/End jump to start/end of week, Enter selects. Esc is handled by
 * the surrounding dialog's dismiss handler, not here.
 *
 * Drives off `selected` / `onSelect` controlled props; if `mode="single"`
 * it's `Date | undefined`; if `mode="range"`, the `DateRange` shape
 * defined below.
 */

import * as React from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface CalendarProps {
  mode?: "single" | "range";
  selected?: Date | DateRange | undefined;
  onSelect?: (value: Date | DateRange | undefined) => void;
  numberOfMonths?: number;
  captionLayout?: "dropdown" | "label";
  className?: string;
  disabled?: (date: Date) => boolean;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date | undefined, b: Date | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInRange(day: Date, range: DateRange): boolean {
  if (!range.from || !range.to) return false;
  const t = startOfDay(day).getTime();
  const a = startOfDay(range.from).getTime();
  const b = startOfDay(range.to).getTime();
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return t >= lo && t <= hi;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function buildMonthGrid(viewMonth: Date): (Date | null)[] {
  const firstOfMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
    1,
  );
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  ).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d),
    );
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface MonthPanelProps {
  viewMonth: Date;
  focused: Date | null;
  onFocusChange: (d: Date) => void;
  mode: "single" | "range";
  range: DateRange;
  selectedSingle?: Date;
  onPick: (d: Date) => void;
  isDisabled?: (d: Date) => boolean;
}

function MonthPanel({
  viewMonth,
  focused,
  onFocusChange,
  mode,
  range,
  selectedSingle,
  onPick,
  isDisabled,
}: MonthPanelProps) {
  const cells = React.useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, d: Date) {
    let next: Date | null = null;
    switch (e.key) {
      case "ArrowLeft":
        next = new Date(d);
        next.setDate(d.getDate() - 1);
        break;
      case "ArrowRight":
        next = new Date(d);
        next.setDate(d.getDate() + 1);
        break;
      case "ArrowUp":
        next = new Date(d);
        next.setDate(d.getDate() - 7);
        break;
      case "ArrowDown":
        next = new Date(d);
        next.setDate(d.getDate() + 7);
        break;
      case "PageUp":
        next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, d.getDate());
        break;
      case "PageDown":
        next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, d.getDate());
        break;
      case "Home":
        next = new Date(d);
        next.setDate(d.getDate() - d.getDay());
        break;
      case "End":
        next = new Date(d);
        next.setDate(d.getDate() + (6 - d.getDay()));
        break;
      default:
        return;
    }
    if (next) {
      e.preventDefault();
      onFocusChange(next);
    }
  }

  const year = viewMonth.getFullYear();
  const monthIndex = viewMonth.getMonth();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center px-2 py-1 text-xs font-medium">
        {MONTH_NAMES[monthIndex]} {year}
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="px-1 py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d)
            return <div key={`empty-${i}`} className="size-8" aria-hidden />;
          const today = startOfDay(new Date()).getTime() === startOfDay(d).getTime();
          const disabled = isDisabled?.(d) ?? false;
          const isFocused = focused && isSameDay(focused, d);
          const isRangeStart = mode === "range" && isSameDay(d, range.from);
          const isRangeEnd = mode === "range" && isSameDay(d, range.to);
          const isInsideRange = mode === "range" && isInRange(d, range);
          const isSingleSelected =
            mode === "single" && selectedSingle && isSameDay(d, selectedSingle);
          return (
            <button
              key={d.toISOString()}
              type="button"
              role="gridcell"
              aria-selected={isRangeStart || isRangeEnd || isSingleSelected || isInsideRange}
              disabled={disabled}
              tabIndex={isFocused ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, d)}
              onClick={() => !disabled && onPick(d)}
              onFocus={() => onFocusChange(d)}
              className={cn(
                "size-8 rounded-md text-xs transition-colors outline-none",
                disabled && "text-muted-foreground/40 line-through cursor-not-allowed",
                !disabled && "hover:bg-muted/60",
                today && !isRangeStart && !isRangeEnd && !isSingleSelected && "ring-1 ring-primary/40",
                isRangeStart && "bg-primary text-primary-foreground hover:bg-primary/90",
                isRangeEnd && "bg-primary text-primary-foreground hover:bg-primary/90",
                isInsideRange && !isRangeStart && !isRangeEnd && "bg-primary/15 text-foreground",
                isSingleSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                isFocused && "ring-2 ring-ring ring-offset-1 ring-offset-background",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function normalizeSelected(
  mode: "single" | "range",
  v: Date | DateRange | undefined,
): { single?: Date; range: DateRange } {
  if (mode === "single") {
    return { single: v instanceof Date ? v : undefined, range: {} };
  }
  return {
    range: (v && !(v instanceof Date) ? v : {}) as DateRange,
  };
}

export function Calendar({
  mode = "single",
  selected,
  onSelect,
  numberOfMonths = 1,
  captionLayout = "label",
  className,
  disabled,
}: CalendarProps) {
  const initialAnchor = React.useMemo(() => {
    if (mode === "single" && selected instanceof Date) return selected;
    if (mode === "range" && (selected as DateRange | undefined)?.from)
      return (selected as DateRange).from as Date;
    return new Date();
  }, [mode, selected]);

  const [anchor, setAnchor] = React.useState<Date>(initialAnchor);
  const [focused, setFocused] = React.useState<Date>(initialAnchor);
  const { single, range } = normalizeSelected(mode, selected);

  // Build the visible month list based on `anchor`.
  const months = React.useMemo(() => {
    const ms: Date[] = [];
    for (let i = 0; i < numberOfMonths; i++) {
      ms.push(new Date(anchor.getFullYear(), anchor.getMonth() + i, 1));
    }
    return ms;
  }, [anchor, numberOfMonths]);

  function pick(d: Date) {
    if (mode === "single") {
      onSelect?.(d);
      return;
    }
    const r = range;
    if (!r.from || (r.from && r.to)) {
      onSelect?.({ from: d, to: undefined });
    } else {
      const lo = r.from.getTime();
      const hi = d.getTime();
      onSelect?.(hi >= lo ? { from: r.from, to: d } : { from: d, to: r.from });
    }
  }

  const yearOptions = React.useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => y - 5 + i);
  }, []);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() =>
            setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))
          }
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <IconChevronLeft className="size-4" />
        </button>

        {captionLayout === "dropdown" ? (
          <div className="flex items-center gap-1">
            <select
              aria-label="Month"
              value={anchor.getMonth()}
              onChange={(e) =>
                setAnchor(
                  new Date(
                    anchor.getFullYear(),
                    Number(e.target.value),
                    1,
                  ),
                )
              }
              className="h-7 rounded-md border border-input bg-background px-2 text-xs"
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i}>
                  {m.slice(0, 3)}
                </option>
              ))}
            </select>
            <select
              aria-label="Year"
              value={anchor.getFullYear()}
              onChange={(e) =>
                setAnchor(
                  new Date(
                    Number(e.target.value),
                    anchor.getMonth(),
                    1,
                  ),
                )
              }
              className="h-7 rounded-md border border-input bg-background px-2 text-xs"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="text-xs font-medium">
            {MONTH_NAMES[months[0].getMonth()]} {months[0].getFullYear()}
            {numberOfMonths > 1
              ? ` – ${MONTH_NAMES[months[months.length - 1].getMonth()]} ${months[months.length - 1].getFullYear()}`
              : ""}
          </span>
        )}

        <button
          type="button"
          aria-label="Next month"
          onClick={() =>
            setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))
          }
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <IconChevronRight className="size-4" />
        </button>
      </div>

      <div
        className={cn(
          "grid gap-4",
          numberOfMonths > 1 && "sm:grid-cols-2",
        )}
        role="grid"
      >
        {months.map((m) => (
          <MonthPanel
            key={`${m.getFullYear()}-${m.getMonth()}`}
            viewMonth={m}
            focused={focused}
            onFocusChange={setFocused}
            mode={mode}
            range={range}
            selectedSingle={single}
            onPick={pick}
            isDisabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

/** Default props `Calendar` reads to start in this exact instant. */
export function todayAtMidnight(): Date {
  return startOfDay(new Date());
}

/** "14:32" formatting helper (zero-padded local hour:minute). */
export function formatTimeLocal(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Re-exports for ergonomic consumer imports.
export { IconChevronUp, IconChevronDown };
