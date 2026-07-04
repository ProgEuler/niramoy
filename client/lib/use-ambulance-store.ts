"use client";

/**
 * Static ambulance store. Mirrors the shape of useHospitalStore but without
 * the stats/real-time layer — ambulances don't have aggregate counters and
 * rarely change in practice. Same JSON-as-data convention as hospitals.json.
 */

import raw from "@/data/ambulances.json";
import type { Ambulance } from "@/lib/types/ambulance";

const AMBULANCES: Ambulance[] = raw as Ambulance[];

export function useAmbulanceStore(): { ambulances: Ambulance[] } {
  return { ambulances: AMBULANCES };
}
