/**
 * Typed wrappers around the `/api/auth/*` endpoints.
 *
 * New two-step registration flow:
 *   1. POST /api/auth/register-user   — create account, receive token pair
 *   2. POST /api/auth/register-hospital — attach hospital profile (authenticated)
 *
 * Legacy combined endpoint (POST /api/auth/register) is kept for compatibility.
 */

import { api } from "./client";

export type UserRole = "patient" | "hospital_admin" | "system_admin";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  role: UserRole;
  hospital_id: number | null;
  expires_at: string;
  username: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  hospital_id: number | null;
  is_active: boolean;
  /** null when no hospital is registered yet; true/false after hospital is created */
  hospital_is_verified: boolean | null;
}

export type FacilityType = "ICU" | "NICU" | "CCU" | "HDU";

// ── Step 1: user account registration ─────────────────────────────────

export interface UserRegisterPayload {
  username: string;
  email: string;
  password: string;
}

// ── Step 2: hospital profile registration ────────────────────────────

export interface HospitalRegisterPayload {
  hospital_name: string;
  district_name: string;
  address: string;
  phone_emergency?: string | null;
  phone_general?: string | null;
  lat?: number | null;
  lng?: number | null;
  facility_types: FacilityType[];
  capacities: Record<FacilityType, number>;
}

export interface HospitalRegisterResponse {
  message: string;
  hospital_id: number;
}

// ── Legacy combined registration payload ──────────────────────────────

export interface RegistrationPayload {
  hospital_name: string;
  district_name: string;
  address: string;
  phone_emergency?: string | null;
  phone_general?: string | null;
  lat?: number | null;
  lng?: number | null;
  facility_types: FacilityType[];
  capacities: Record<FacilityType, number>;
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

export interface RegistrationResponse {
  message: string;
  hospital_id: number;
}

// ── Endpoints ──────────────────────────────────────────────────────────

export function login(input: { email: string; password: string }) {
  return api.post<TokenPair>("/api/auth/login", input);
}

export function refresh(refresh_token: string) {
  return api.post<TokenPair>("/api/auth/refresh", { refresh_token });
}

export function me(token: string) {
  return api.get<CurrentUser>("/api/auth/me", { token });
}

/** Step 1 — create user account and receive a token pair. */
export function registerUser(payload: UserRegisterPayload) {
  return api.post<TokenPair>("/api/auth/register-user", payload);
}

/** Step 2 — attach hospital profile to the authenticated user. */
export function registerHospitalProfile(
  payload: HospitalRegisterPayload,
  token: string,
) {
  return api.post<HospitalRegisterResponse>("/api/auth/register-hospital", payload, { token });
}

/** Legacy combined endpoint — kept for compatibility. */
export function registerHospital(payload: RegistrationPayload) {
  return api.post<RegistrationResponse>("/api/auth/register", payload);
}

export function forgotPassword(email: string) {
  return api.post<{ message: string }>("/api/auth/forgot-password", { email });
}

export function resetPassword(input: { token: string; new_password: string }) {
  return api.post<{ message: string }>("/api/auth/reset-password", input);
}

export function logout(token: string) {
  void token;
  return Promise.resolve();
}
