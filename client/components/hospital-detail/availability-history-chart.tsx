"use client";

/**
 * Page-3 availability-history chart. A 7-day line chart of bed counts, with
 * tabs to switch between ICU / NICU / CCU / HDU. Pure SVG — no chart library
 * — so it's lightweight, theme-aware, and accessible.
 *
 * History is synthetic (see lib/hospital-derivations.ts) and ends on the
 * current count, so the chart's last point matches the live panel above.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { availabilityColor, getAvailabilityClass } from "@/lib/hospital-utils";
import { ALL_BED_TYPES, type BedType, type Hospital } from "@/lib/types/hospital";
import { generateHistory } from "@/lib/hospital-derivations";

interface Props {
  hospital: Hospital;
}

const LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

export function AvailabilityHistoryChart({ hospital }: Props) {
  const [active, setActive] = useState<BedType>("icu");
  const history = generateHistory(hospital);

  return (
    <section aria-labelledby="history-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="history-heading"
            className="font-heading text-sm font-semibold text-foreground sm:text-base"
          >
            Availability history
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Last 7 days of self-reported bed counts. Use this to judge how
            reliably the hospital updates its data.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Bed type"
          className="inline-flex h-7 items-center rounded-md border bg-card p-0.5 shadow-sm"
        >
          {ALL_BED_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active === t}
              onClick={() => setActive(t)}
              className={cn(
                "h-6 rounded-sm px-2.5 text-[11px] font-medium transition-colors",
                active === t
                  ? "bg-niramoy-teal text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <ChartCard hospital={hospital} type={active} history={history[active]} />
    </section>
  );
}

interface ChartCardProps {
  hospital: Hospital;
  type: BedType;
  history: { date: string; available: number }[];
}

function ChartCard({ hospital, type, history }: ChartCardProps) {
  const total = hospital.beds[type].total;
  const color = availabilityColor(getAvailabilityClass(hospital, type));
  const dataPoints = history.map((p) => ({ ...p, value: p.available }));
  // Pad with a leading/trailing point so the line meets the y-axis edges.
  const minValue = 0;
  const maxValue = Math.max(total, ...dataPoints.map((d) => d.value), 1);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          <span
            className="mr-1.5 inline-block size-2 rounded-sm align-middle"
            style={{ backgroundColor: color }}
          />
          Available {LABEL[type]} beds
        </span>
        <span className="tabular-nums">
          Today:{" "}
          <span className="font-semibold text-foreground">
            {dataPoints[dataPoints.length - 1]?.value ?? 0}
          </span>{" "}
          / {total}
        </span>
      </div>

      <div className="relative h-44 w-full">
        <svg
          viewBox="0 0 700 200"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`${LABEL[type]} availability over the last 7 days`}
        >
          {/* Y-axis gridlines */}
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1={0}
              x2={700}
              y1={200 - p * 200}
              y2={200 - p * 200}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="3 4"
            />
          ))}

          {/* Filled area under line */}
          {(() => {
            const path = pointsToPath(dataPoints, minValue, maxValue, true);
            return (
              <path
                d={path}
                fill={color}
                fillOpacity={0.1}
              />
            );
          })()}

          {/* Line */}
          {(() => {
            const path = pointsToPath(dataPoints, minValue, maxValue, false);
            return (
              <path
                d={path}
                stroke={color}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })()}

          {/* Points */}
          {dataPoints.map((d, i) => {
            const x = (i / (dataPoints.length - 1)) * 700;
            const y =
              200 - ((d.value - minValue) / (maxValue - minValue || 1)) * 200;
            const isLast = i === dataPoints.length - 1;
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={isLast ? 5 : 3.5}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                />
                {isLast && (
                  <circle
                    cx={x}
                    cy={y}
                    r={9}
                    fill={color}
                    fillOpacity={0.25}
                  >
                    <animate
                      attributeName="r"
                      values="6;14;6"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="fill-opacity"
                      values="0.35;0;0.35"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {dataPoints.map((d, i) => {
          const date = new Date(d.date);
          const label = i === dataPoints.length - 1
            ? "Today"
            : date.toLocaleDateString("en-GB", {
                weekday: "short",
              });
          return <span key={i}>{label}</span>;
        })}
      </div>
    </div>
  );
}

function pointsToPath(
  data: { value: number }[],
  minValue: number,
  maxValue: number,
  close: boolean,
): string {
  if (data.length === 0) return "";
  const xs = data.map((_, i) => (i / (data.length - 1)) * 700);
  const ys = data.map(
    (d) =>
      200 - ((d.value - minValue) / (maxValue - minValue || 1)) * 200,
  );
  let path = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < data.length; i += 1) {
    path += ` L ${xs[i]} ${ys[i]}`;
  }
  if (close) {
    path += ` L ${xs[xs.length - 1]} 200 L ${xs[0]} 200 Z`;
  }
  return path;
}
