/**
 * Filter state + reducer for the Find-a-Hospital page.
 *
 * Pure — no React. The reducer is exhaustively typed via a discriminated
 * union; any new field on `FilterState` must come with an action here.
 *
 * `applyFilters` is also pure and lives in this file because it needs the
 * FilterState shape. Sorting happens here so result list and map both see the
 * same ordering key.
 */

import type {
  BangladeshDivision,
  BedType,
  Hospital,
} from "@/lib/types/hospital";
import { haversineKm } from "@/lib/hospital-utils";

// ─── types ────────────────────────────────────────────────────────────────

export type SortKey = "nearest" | "available" | "cost" | "rating";

export type GeoStatus = "idle" | "loading" | "ok" | "denied" | "error";

export type RadiusKm = 5 | 10 | 25;

/**
 * Result layout on the search-results page.
 * - "list" : stacked result cards (default)
 * - "map"  : full-width MapLibre canvas with cards alongside
 */
export type ViewMode = "list" | "map";

/** Maximum number of hospitals that can be selected for side-by-side compare. */
export const MAX_COMPARE = 4;

export interface FilterState {
  /** Selected bed types to display. Empty array = show all. */
  bedTypes: BedType[];
  division: BangladeshDivision | "all";
  district: string | "all";
  /** When true, hide hospitals with zero beds across all four types. */
  onlyAvailable: boolean;
  /** Inclusive BDT cost range per day. */
  costRange: [number, number];
  /** Minimum star rating, 0..5. 0 = no filter. */
  minRating: number;
  /** Active radius. Only meaningful when userCoords !== null. */
  radiusKm: RadiusKm | null;
  /** [lng, lat] of the user when geolocation is granted. */
  userCoords: [number, number] | null;
  sort: SortKey;
  hoveredId: string | null;
  selectedId: string | null;
  geoStatus: GeoStatus;
  /** Layout on the search-results page. */
  viewMode: ViewMode;
  /** Hospital ids selected for comparison (capped at MAX_COMPARE). */
  compareIds: string[];
}

export const INITIAL_FILTER_STATE: FilterState = {
  bedTypes: ["icu", "nicu", "ccu", "hdu"],
  division: "all",
  district: "all",
  onlyAvailable: false,
  costRange: [0, 20_000],
  minRating: 0,
  radiusKm: null,
  userCoords: null,
  sort: "available",
  hoveredId: null,
  selectedId: null,
  geoStatus: "idle",
  viewMode: "list",
  compareIds: [],
};

export type FilterAction =
  | { type: "TOGGLE_BED_TYPE"; bedType: BedType }
  | { type: "SET_DIVISION"; division: BangladeshDivision | "all" }
  | { type: "SET_DISTRICT"; district: string }
  | { type: "TOGGLE_ONLY_AVAILABLE" }
  | { type: "SET_COST_RANGE"; range: [number, number] }
  | { type: "SET_MIN_RATING"; rating: number }
  | { type: "SET_RADIUS"; radius: RadiusKm | null }
  | { type: "SET_USER_COORDS"; coords: [number, number] | null }
  | { type: "SET_SORT"; sort: SortKey }
  | { type: "SET_HOVERED"; id: string | null }
  | { type: "SET_SELECTED"; id: string | null }
  | { type: "SET_GEO_STATUS"; status: GeoStatus }
  | { type: "SET_VIEW_MODE"; mode: ViewMode }
  | { type: "TOGGLE_COMPARE"; id: string }
  | { type: "CLEAR_COMPARE" }
  | { type: "CLEAR_ALL" };

// ─── reducer ──────────────────────────────────────────────────────────────

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "TOGGLE_BED_TYPE": {
      const has = state.bedTypes.includes(action.bedType);
      return {
        ...state,
        bedTypes: has
          ? state.bedTypes.filter((b) => b !== action.bedType)
          : [...state.bedTypes, action.bedType],
      };
    }
    case "SET_DIVISION":
      // Changing division resets the district, since the previous district may
      // not exist in the new division.
      return { ...state, division: action.division, district: "all" };
    case "SET_DISTRICT":
      return { ...state, district: action.district };
    case "TOGGLE_ONLY_AVAILABLE":
      return { ...state, onlyAvailable: !state.onlyAvailable };
    case "SET_COST_RANGE":
      return { ...state, costRange: action.range };
    case "SET_MIN_RATING":
      return { ...state, minRating: action.rating };
    case "SET_RADIUS":
      return { ...state, radiusKm: action.radius };
    case "SET_USER_COORDS":
      return { ...state, userCoords: action.coords };
    case "SET_SORT":
      return { ...state, sort: action.sort };
    case "SET_HOVERED":
      return state.hoveredId === action.id ? state : { ...state, hoveredId: action.id };
    case "SET_SELECTED":
      return { ...state, selectedId: action.id };
    case "SET_GEO_STATUS":
      return { ...state, geoStatus: action.status };
    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.mode };
    case "TOGGLE_COMPARE": {
      const has = state.compareIds.includes(action.id);
      if (has) {
        return { ...state, compareIds: state.compareIds.filter((x) => x !== action.id) };
      }
      // Cap at MAX_COMPARE — silently drop the add when full.
      if (state.compareIds.length >= MAX_COMPARE) return state;
      return { ...state, compareIds: [...state.compareIds, action.id] };
    }
    case "CLEAR_COMPARE":
      return { ...state, compareIds: [] };
    case "CLEAR_ALL":
      return {
        ...INITIAL_FILTER_STATE,
        // Preserve identity of arrays the user can't toggle off
        bedTypes: INITIAL_FILTER_STATE.bedTypes.slice(),
        costRange: [...INITIAL_FILTER_STATE.costRange] as [number, number],
        compareIds: [],
      };
  }
}

// ─── filter + sort ────────────────────────────────────────────────────────

const FREE_BED_TYPES: BedType[] = ["icu", "nicu", "ccu", "hdu"];

function totalAvailable(h: Hospital): number {
  return FREE_BED_TYPES.reduce((sum, t) => sum + h.beds[t].available, 0);
}

function averageCost(h: Hospital): number {
  const totals = FREE_BED_TYPES.map((t) => h.price[t]);
  return totals.reduce((s, n) => s + n, 0) / totals.length;
}

function offerScore(h: Hospital, types: BedType[]): number {
  if (types.length === 0) return 1;
  let sum = 0;
  for (const t of types) {
    const { total, available } = h.beds[t];
    if (total <= 0) continue; // doesn't offer this type — neutral
    sum += available > 0 ? available / total : 0;
  }
  return sum;
}

/**
 * Single pure pipeline: filter → optional radius clip → sort. Result list and
 * map both consume the output, so they stay in lockstep.
 */
export function applyFilters(
  hospitals: Hospital[],
  state: FilterState,
): Hospital[] {
  const [lo, hi] = state.costRange;
  const wantTypes = state.bedTypes;

  let result = hospitals.filter((h) => {
    if (state.division !== "all" && h.division !== state.division) return false;
    if (state.district !== "all" && h.district !== state.district) return false;

    if (state.onlyAvailable && totalAvailable(h) <= 0) return false;

    // Minimum rating filter — hospitals without a rating are excluded when a
    // positive min is set, because we can't honestly claim they meet the bar.
    if (state.minRating > 0) {
      const rating = h.rating ?? 0;
      if (rating < state.minRating) return false;
    }

    // Cost match: at least one offered bed type must fall in [lo, hi]. Treat
    // total===0 (not offered) as skip — a hospital that hasn't recorded any
    // bed capacity yet should still be visible, not silently dropped.
    const inRange = FREE_BED_TYPES.some((t) => {
      if (h.beds[t].total <= 0) return false;
      return h.price[t] >= lo && h.price[t] <= hi;
    });
    // If the hospital offers no bed types at all (e.g. freshly created, no
    // capacity recorded yet), keep it visible rather than hiding it.
    const offersAnyBeds = FREE_BED_TYPES.some((t) => h.beds[t].total > 0);
    if (offersAnyBeds && !inRange) return false;

    return true;
  });

  // Radius clipping only meaningful when user coords exist.
  if (state.userCoords && state.radiusKm !== null) {
    result = result.filter((h) => {
      const d = haversineKm(state.userCoords!, [h.lng, h.lat]);
      return d <= state.radiusKm!;
    });
  }

  // Sort.
  const sort = state.sort;
  const userCoords = state.userCoords;
  result = result.slice().sort((a, b) => {
    switch (sort) {
      case "nearest": {
        if (userCoords) {
          return (
            haversineKm(userCoords, [a.lng, a.lat]) -
            haversineKm(userCoords, [b.lng, b.lat])
          );
        }
        // Falls back to alphabetical when no location yet.
        return a.name.localeCompare(b.name);
      }
      case "available": {
        return offerScore(b, wantTypes) - offerScore(a, wantTypes);
      }
      case "cost": {
        return averageCost(a) - averageCost(b);
      }
      case "rating": {
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
    }
  });

  return result;
}
