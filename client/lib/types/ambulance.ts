/**
 * Domain types for the Ambulance Directory.
 *
 * Mirrors the seeded data in data/ambulances.json. Kept separate from
 * `hospital.ts` because ambulances aren't critical-care beds and don't
 * participate in the same store/reducer pipeline.
 */

export type AmbulanceType = "government" | "private" | "ngo";

export interface Ambulance {
  /** Stable slug, e.g. "dmch-ambulance". */
  id: string;
  name: string;
  organization?: string;
  division: import("@/lib/types/hospital").BangladeshDivision;
  district: string;
  phone: string;
  type: AmbulanceType;
  /** When true, the service runs 24 hours. */
  available24h: boolean;
}
