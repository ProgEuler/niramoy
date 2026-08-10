import { api } from "./client";

export interface Division {
  id: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
  division_id: number;
}

export function listDivisions() {
  return api.get<Division[]>("/api/public/divisions");
}

export function listDistricts(divisionId?: number) {
  return api.get<District[]>("/api/public/districts", {
    query: divisionId !== undefined ? { division_id: divisionId } : undefined,
  });
}
