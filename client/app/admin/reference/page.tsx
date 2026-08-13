"use client";

/**
 * PAGE 7 — Reference Data (system admin).
 *
 * The lookup tables that everything else depends on, with three sections:
 *   - Divisions & Districts (two-panel CRUD layout)
 *   - Ambulance Directory (full CRUD table)
 *   - Bed Types (4-row list with descriptions + icons)
 *
 * Rarely touched but needs to exist so platform data stays editable.
 */

import { ReferenceDataPanel } from "@/components/sysadmin/reference-data";
import { useAmbulanceStore } from "@/lib/use-ambulance-store";

export default function ReferenceDataPage() {
  const { ambulances } = useAmbulanceStore();

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Reference data
        </h1>
        <p className="text-xs text-muted-foreground">
          Divisions, districts, ambulances, and bed-type metadata that the
          platform depends on.
        </p>
      </div>

      <ReferenceDataPanel ambulances={ambulances} />
    </div>
  );
}