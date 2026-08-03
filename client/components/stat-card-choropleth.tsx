"use client";

import type { ChoroplethFeature } from "@/components/charts";
import {
  ChoroplethChart,
  ChoroplethFeatureComponent,
  ChoroplethTooltip,
} from "@/components/charts";
import { useState } from "react";
import { useWorldDataStandalone } from "@/lib/use-world-data";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  getVisitorColor,
  getVisitorValue,
} from "../data/visitors";
import {
  StatCardChart,
  type StatCardHoverState,
} from "./stat-card-chart";
import { StatCardChoroplethHoverBridge } from "./stat-card-choropleth-hover-bridge";

export function StatCardChoropleth() {
  const { worldData, isLoading } = useWorldDataStandalone();
  const [hover, setHover] = useState<StatCardHoverState>({
    value: null,
    label: null,
    trend: null,
  });

  return (
    <Card className="relative w-full gap-0 overflow-hidden py-0 rounded-none">


      <CardContent className="p-0">
        {isLoading || !worldData ? (
          <StatCardChart className="mx-0 mb-0 min-h-[420px]" size="lg">
            <div className="flex h-full min-h-[420px] items-center justify-center text-muted-foreground text-xs">
              Loading map…
            </div>
          </StatCardChart>
        ) : (
          <StatCardChart className="mx-0 mb-0 min-h-[420px]" size="lg">
            <ChoroplethChart
              aspectRatio="2.5 / 1"
              className="min-h-[420px] w-full"
              data={worldData}
            >
              <StatCardChoroplethHoverBridge onHoverChange={setHover} />
              <ChoroplethFeatureComponent
                getFeatureColor={(feature: ChoroplethFeature) =>
                  getVisitorColor(feature)
                }
              />
              {/* <ChoroplethTooltip
                getFeatureValue={getVisitorValue}
                valueLabel="Visitors"
              /> */}
            </ChoroplethChart>
          </StatCardChart>
        )}
      </CardContent>
    </Card>
  );
}
