"use client";

/**
 * Static Bangladesh divisions → districts map. Source: BBS Bangladesh
 * administrative divisions (8 divisions, 64 districts). Keeping this data in
 * code avoids an `/api/reference/districts` round trip for the public UX.
 * If/when that API exists, swap this hook for a SWR query — same return shape.
 */

import { useMemo } from "react";

import type { BangladeshDivision } from "@/lib/types/hospital";

export const DIVISION_DISTRICTS: Readonly<
  Record<BangladeshDivision, readonly string[]>
> = {
  Dhaka: [
    "Dhaka",
    "Faridpur",
    "Gazipur",
    "Gopalganj",
    "Kishoreganj",
    "Madaripur",
    "Manikganj",
    "Munshiganj",
    "Narayanganj",
    "Narsingdi",
    "Rajbari",
    "Shariatpur",
    "Tangail",
  ],
  Chattogram: [
    "Bandarban",
    "Brahmanbaria",
    "Chandpur",
    "Chattogram",
    "Cox's Bazar",
    "Cumilla",
    "Feni",
    "Khagrachhari",
    "Lakshmipur",
    "Noakhali",
    "Rangamati",
  ],
  Rajshahi: [
    "Bogura",
    "Chapainawabganj",
    "Joypurhat",
    "Naogaon",
    "Natore",
    "Pabna",
    "Rajshahi",
    "Sirajganj",
  ],
  Khulna: [
    "Bagerhat",
    "Chuadanga",
    "Jashore",
    "Jhenaidah",
    "Khulna",
    "Kushtia",
    "Magura",
    "Meherpur",
    "Narail",
    "Satkhira",
  ],
  Barishal: [
    "Barguna",
    "Barishal",
    "Bhola",
    "Jhalokati",
    "Patuakhali",
    "Pirojpur",
  ],
  Rangpur: [
    "Dinajpur",
    "Gaibandha",
    "Kurigram",
    "Lalmonirhat",
    "Nilphamari",
    "Panchagarh",
    "Rangpur",
    "Thakurgaon",
  ],
  Mymensingh: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
  Sylhet: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
};

/**
 * Returns the list of districts for a division, or `[]` for "all".
 * Memoized so consumers can pass it cheaply into `Select`.
 */
export function useDistricts(
  division: BangladeshDivision | "all",
): readonly string[] {
  return useMemo(() => {
    if (division === "all") return [];
    return DIVISION_DISTRICTS[division];
  }, [division]);
}
