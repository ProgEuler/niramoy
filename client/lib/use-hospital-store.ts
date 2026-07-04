"use client";

/**
 * Hospital store — the SINGLE seam between data and UI.
 *
 * Today this just imports the static JSON and computes aggregate stats. When
 * real-time updates (SSE / WebSocket / polling) are wired in, they plug into
 * the `useEffect` below and nothing in the component tree has to change.
 *
 * It must:
 *  - import the JSON (so static seed data flows through one file)
 *  - return a stable shape `{ hospitals, stats }`
 *  - never export `HOSPITALS` directly so consumers can't bypass the hook
 */

import { useEffect, useMemo, useState } from "react";

import rawHospitals from "@/data/hospitals.json";
import { computeStats } from "@/lib/hospital-utils";
import type { Hospital, HospitalStats } from "@/lib/types/hospital";

const HOSPITALS: Hospital[] = rawHospitals as Hospital[];

export interface UseHospitalStoreResult {
  hospitals: Hospital[];
  stats: HospitalStats;
}

export function useHospitalStore(): UseHospitalStoreResult {
  const [hospitals, setHospitals] = useState<Hospital[]>(HOSPITALS);

  // ── REAL-TIME EXTENSION POINT ────────────────────────────────────────────
  // Future: subscribe to /api/hospitals/stream here. The patch format would
  // be `{ id, beds?, price?, last_updated? }`; merge into `hospitals` via
  // setHospitals. No component change required.
  useEffect(() => {
    // Reference setHospitals so the unused-var lint rule stays quiet until
    // the real-time subscription is implemented. When SSE/WS lands, replace
    // this with `setHospitals(prev => mergePatch(prev, event))`.
    void setHospitals;
    return () => {
      /* placeholder for cleanup of future subscription */
    };
  }, []);

  const stats = useMemo(() => computeStats(hospitals), [hospitals]);

  return { hospitals, stats };
}
