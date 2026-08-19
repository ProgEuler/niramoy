/**
 * Map the backend `HospitalSummary` shape to the UI `Hospital` shape.
 *
 * The frontend `Hospital` type was originally designed around a static JSON
 * file with rich fields (slug ids, `name_bn`, `type`, single `phone`, etc.).
 * The backend `HospitalSummary` is a different, flatter shape (numeric ids,
 * `phone_emergency`/`phone_general`, no Bengali name yet, no hospital type
 * column).
 *
 * Until the two schemas fully align, the page-level UI uses these mappers so
 * downstream components that depend on `Hospital` keep working without
 * changes. When the backend adds fields like `name_bn` or `type`, drop the
 * fallback defaults here.
 */

import type {
  Hospital as UiHospital,
  HospitalType,
  BangladeshDivision,
} from "@/lib/types/hospital";
import type { ALL_BED_TYPES } from "@/lib/types/hospital";
import type { HospitalSummary, HospitalDetail } from "./hospitals";

type BedType = (typeof ALL_BED_TYPES)[number];

const VALID_DIVISIONS: ReadonlySet<BangladeshDivision> = new Set([
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Rangpur",
  "Mymensingh",
  "Sylhet",
]);

/**
 * Slug-ify a hospital for the URL `/hospital/<id>` route. Matches the
 * pattern the static JSON used (`dmch-dhaka` style). For numeric backend
 * ids we fall back to a stable slug derived from the name + numeric id so
 * the URL is shareable.
 */
function toSlug(summary: Pick<HospitalSummary, "id" | "name">): string {
  const slugPart = summary.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slugPart.length > 0
    ? `${slugPart}-${summary.id}`
    : `hospital-${summary.id}`;
}

/**
 * Extract the numeric backend id from a slug produced by `toSlug`.
 *
 * The detail-page URL is `/hospital/${slug}` where the slug embeds the
 * numeric id as a trailing suffix (e.g. `eos-qui-et-et-molli-5`). Legacy
 * seed data uses purely textual slugs (`dmch-dhaka`) — in that case there
 * is no numeric id to extract and this returns `null`.
 */
export function parseSlugId(slug: string): number | null {
  const match = /-(\d+)$/.exec(slug);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Pick a division. Backend may return null when district-to-division isn't
 * mapped yet — fallback to "Dhaka" so the UI's typed `BangladeshDivision`
 * union still accepts it. (Better: surface "Unknown" to the user once the
 * division reference data covers all rows.)
 */
function toDivision(value: string | null | undefined): BangladeshDivision {
  if (value && VALID_DIVISIONS.has(value as BangladeshDivision)) {
    return value as BangladeshDivision;
  }
  return "Dhaka";
}

function bedsFromSummary(s: HospitalSummary): UiHospital["beds"] {
  return {
    icu: { total: s.icu_total, available: s.icu_available },
    nicu: { total: s.nicu_total, available: s.nicu_available },
    ccu: { total: s.ccu_total, available: s.ccu_available },
    hdu: { total: s.hdu_total, available: s.hdu_available },
  };
}

function priceFromSummary(s: HospitalSummary): UiHospital["price"] {
  return {
    icu: s.cost_per_day_icu,
    nicu: s.cost_per_day_nicu,
    ccu: s.cost_per_day_ccu,
    hdu: s.cost_per_day_hdu,
  };
}

/**
 * The `Hospital.type` field is "public" | "private". Backend doesn't yet
 * expose this on the summary — infer it: 0-cost for every bed type means
 * public, otherwise private.
 */
function inferType(
  price: UiHospital["price"],
  isActive: boolean
): HospitalType {
  if (!isActive) return "private";
  const allFree = (Object.keys(price) as BedType[]).every(
    (t) => (price[t] ?? 0) === 0
  );
  return allFree ? "public" : "private";
}

/**
 * Public hospitals → "999" placeholder. Real phones live on
 * HospitalDetail. We never block the UI rendering on missing phone data.
 */
function fallbackPhone(detail?: HospitalDetail | null): string {
  if (detail?.phone_emergency) return detail.phone_emergency;
  if (detail?.phone_general) return detail.phone_general;
  return "+880000000000";
}

/**
 * Convert a backend summary into the UI `Hospital` shape consumed by
 * `applyFilters`, `BedChip`, `HospitalDetailCard`, and the map.
 */
export function summaryToHospital(
  s: HospitalSummary,
  detail?: HospitalDetail | null
): UiHospital {
  const price = priceFromSummary(s);
  const beds = bedsFromSummary(s);
  // Last-updated: backend ISO timestamp. Fallback to "now" only when the
  // record is honestly stale so the relative-time helper reads "just now"
  // rather than 1970.
  const lastUpdated =
    s.last_updated && Number.isFinite(new Date(s.last_updated).getTime())
      ? s.last_updated
      : new Date().toISOString();

  return {
    id: toSlug(s),
    name: s.name,
    // Bengali display name lives on the detail endpoint today; until then
    // show the English name in both fields so the header doesn't break.
    name_bn: detail?.name ?? s.name,
    division: toDivision(s.division),
    district: s.district || "Dhaka",
    lat: s.latitude ?? 23.685, // Center of Bangladesh as a safe fallback.
    lng: s.longitude ?? 90.356,
    type: inferType(price, s.is_active),
    beds,
    price,
    phone: fallbackPhone(detail),
    last_updated: lastUpdated,
    verified: s.is_verified,
    address: s.address,
    // Only set rating when the backend actually has reviews (so the
    // "★N/A" badges don't show a stray 0.0).
    rating: s.total_reviews > 0 ? s.average_rating : undefined,
  };
}

/**
 * Convert a list of summaries at once. Detail lookups are optional — when
 * provided, they enrich phone/Bengali-name fields. Pass an empty map to
 * skip enrichment.
 */
export function summariesToHospitals(
  summaries: HospitalSummary[],
  details?: Map<number, HospitalDetail>
): UiHospital[] {
  return summaries.map((s) =>
    summaryToHospital(s, details?.get(s.id) ?? null)
  );
}
