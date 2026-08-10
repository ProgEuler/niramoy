"use client";

/**
 * Step 2 of hospital-admin registration.
 *
 * The user is already authenticated (account created in step 1).
 * They fill in their hospital's details and submit for admin review.
 * No credential fields here — those live in /register.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconBuildingHospital,
  IconCheck,
  IconLoader2,
  IconMapPin,
  IconShieldCheck,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Map, MapMarker, MarkerContent, MapControls } from "@/components/ui/map";
import { useRegisterHospitalProfile } from "@/lib/auth/hooks";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { FacilityType } from "@/lib/api/auth";
import {
  ALL_DIVISIONS,
  type BangladeshDivision,
} from "@/lib/types/hospital";
import { DIVISION_DISTRICTS } from "@/lib/use-districts";

interface FormState {
  name: string;
  division: BangladeshDivision | null;
  district: string;
  address: string;
  lat: number;
  lng: number;
  emergencyPhone: string;
  generalPhone: string;
  facilityTypes: FacilityType[];
  capacity: Record<FacilityType, number>;
}

const DEFAULT_LAT = 23.777;
const DEFAULT_LNG = 90.399;

const INITIAL: FormState = {
  name: "",
  division: null,
  district: "",
  address: "",
  lat: DEFAULT_LAT,
  lng: DEFAULT_LNG,
  emergencyPhone: "",
  generalPhone: "",
  facilityTypes: [],
  capacity: { ICU: 0, NICU: 0, CCU: 0, HDU: 0 },
};

const BED_LABEL: Record<FacilityType, string> = {
  ICU: "ICU",
  NICU: "NICU",
  CCU: "CCU",
  HDU: "HDU",
};

const ALL_FACILITIES: readonly FacilityType[] = ["ICU", "NICU", "CCU", "HDU"];

interface HospitalProfileFormProps {
  onSuccess?: (hospitalId: number) => void;
}

export function HospitalProfileForm({ onSuccess }: HospitalProfileFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [banner, setBanner] = useState<string | null>(null);

  const districts = useMemo(
    () => (form.division ? DIVISION_DISTRICTS[form.division] : []),
    [form.division],
  );

  useEffect(() => {
    setForm((f) => ({ ...f, district: "" }));
  }, [form.division]);

  const enabledTypes = useMemo(
    () => new Set<FacilityType>(form.facilityTypes),
    [form.facilityTypes],
  );

  const register = useRegisterHospitalProfile({
    onSuccess: (data) => {
      setErrors({});
      setBanner(null);
      setSubmitted(true);
      onSuccess?.(data.hospital_id);
    },
    onError: (err: unknown) => {
      setErrors({});
      setBanner(null);
      if (err instanceof ApiError) {
        if (err.fieldErrors.length > 0) {
          const next: Partial<Record<keyof FormState, string>> = {};
          const unmapped: string[] = [];
          for (const fe of err.fieldErrors) {
            const mapped = mapFieldError(fe.field);
            if (mapped) {
              next[mapped] = fe.message;
            } else {
              unmapped.push(fe.message);
            }
          }
          setErrors(next);
          if (unmapped.length > 0) setBanner(unmapped.join(" • "));
          return;
        }
        if (err.field) {
          const mapped = mapFieldError(err.field);
          if (mapped) {
            setErrors({ [mapped]: err.detail });
            return;
          }
        }
        setBanner(err.detail || "Submission failed. Please try again.");
        return;
      }
      setBanner("Network error. Please try again.");
    },
  });

  function mapFieldError(field: string): keyof FormState | null {
    switch (field) {
      case "hospital_name":
        return "name";
      case "district_name":
        return "district";
      case "address":
        return "address";
      case "phone_emergency":
        return "emergencyPhone";
      case "phone_general":
        return "generalPhone";
      case "lat":
      case "lng":
        return null;
      case "facility_types":
      case "capacities":
        return "facilityTypes";
      default:
        return null;
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleFacility(t: FacilityType) {
    setForm((f) => {
      const has = f.facilityTypes.includes(t);
      return {
        ...f,
        facilityTypes: has
          ? f.facilityTypes.filter((x) => x !== t)
          : [...f.facilityTypes, t],
        capacity: {
          ...f.capacity,
          [t]: has ? 0 : f.capacity[t],
        },
      };
    });
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Hospital name is required";
    if (form.division == null) next.division = "Please pick a division";
    if (!form.district) next.district = "Please pick a district";
    if (!form.address.trim()) next.address = "Address is required";
    if (!form.emergencyPhone.trim())
      next.emergencyPhone = "Emergency phone is required";
    if (form.facilityTypes.length === 0)
      next.facilityTypes = "Pick at least one facility type";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    const filteredCapacities = form.facilityTypes.reduce<
      Partial<Record<FacilityType, number>>
    >((acc, t) => {
      acc[t] = form.capacity[t] ?? 0;
      return acc;
    }, {});

    register.mutate({
      hospital_name: form.name.trim(),
      district_name: form.district,
      address: form.address.trim(),
      phone_emergency: form.emergencyPhone.trim() || null,
      phone_general: form.generalPhone.trim() || null,
      lat: form.lat,
      lng: form.lng,
      facility_types: form.facilityTypes,
      capacities: filteredCapacities as Record<FacilityType, number>,
    });
  }

  if (submitted) {
    return <PostSubmitBanner />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {banner && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive"
        >
          {banner}
        </div>
      )}

      <Section
        title="Hospital details"
        icon={<IconBuildingHospital className="size-4" />}
      >
        <Field label="Hospital full name" error={errors.name}>
          <Input
            placeholder="e.g. Dhaka General Hospital"
            className="h-9"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Division" error={errors.division}>
            <Select
              value={form.division ?? ""}
              onValueChange={(v) => update("division", v as BangladeshDivision)}
            >
              <SelectTrigger
                className="h-9 w-full"
                aria-invalid={Boolean(errors.division)}
              >
                <SelectValue placeholder="Choose a division" />
              </SelectTrigger>
              <SelectContent>
                {ALL_DIVISIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="District" error={errors.district}>
            <Select
              value={form.district}
              disabled={form.division == null}
              onValueChange={(v) => update("district", v)}
            >
              <SelectTrigger
                className="h-9 w-full"
                aria-invalid={Boolean(errors.district)}
              >
                <SelectValue
                  placeholder={
                    form.division == null
                      ? "Pick a division first"
                      : "Choose a district"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {districts.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Full address" error={errors.address}>
          <Input
            placeholder="Street, area, postal code"
            className="h-9"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            aria-invalid={Boolean(errors.address)}
          />
        </Field>

        <Field
          label="Pin location"
          hint="Drag the pin to set the exact location."
        >
          <div className="relative h-64 w-full overflow-hidden rounded-md border">
            <Map center={[form.lng, form.lat]} zoom={12} fadeDuration={0}>
              <MapMarker
                longitude={form.lng}
                latitude={form.lat}
                draggable
                onDragEnd={(p) => {
                  update("lng", p.lng);
                  update("lat", p.lat);
                }}
              >
                <MarkerContent>
                  <div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-niramoy-teal text-white shadow-lg">
                    <IconMapPin className="size-4" />
                  </div>
                </MarkerContent>
              </MapMarker>
              <MapControls showZoom />
            </Map>
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
          </p>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Emergency phone" error={errors.emergencyPhone}>
            <Input
              type="tel"
              placeholder="+8801XXXXXXXXX"
              className="h-9"
              value={form.emergencyPhone}
              onChange={(e) => update("emergencyPhone", e.target.value)}
              aria-invalid={Boolean(errors.emergencyPhone)}
            />
          </Field>
          <Field label="General phone">
            <Input
              type="tel"
              placeholder="+8801XXXXXXXXX"
              className="h-9"
              value={form.generalPhone}
              onChange={(e) => update("generalPhone", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Facility types & capacity"
        icon={<IconShieldCheck className="size-4" />}
        error={errors.facilityTypes}
      >
        <ul className="space-y-2">
          {ALL_FACILITIES.map((t) => {
            const on = enabledTypes.has(t);
            return (
              <li
                key={t}
                className={cn(
                  "flex items-center gap-3 rounded-md border bg-card p-3 transition-colors",
                  on && "border-niramoy-teal/40 bg-niramoy-teal/5",
                )}
              >
                <Checkbox
                  id={`facility-${t}`}
                  checked={on}
                  onCheckedChange={() => toggleFacility(t)}
                  aria-label={`Offer ${BED_LABEL[t]} beds`}
                />
                <label
                  htmlFor={`facility-${t}`}
                  className="flex-1 cursor-pointer text-sm font-medium text-foreground"
                >
                  {BED_LABEL[t]}
                </label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Total capacity"
                  className="h-8 w-32"
                  disabled={!on}
                  value={form.capacity[t] || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      capacity: {
                        ...f.capacity,
                        [t]: Math.max(0, Number(e.target.value) || 0),
                      },
                    }))
                  }
                />
              </li>
            );
          })}
        </ul>
      </Section>

      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted-foreground">
          By submitting, you agree that hospital staff will keep bed counts
          accurate and timely.
        </p>
        <Button
          type="submit"
          disabled={register.isPending}
          className="h-10 gap-1.5 bg-niramoy-teal px-5 text-sm text-white hover:bg-niramoy-teal/90"
        >
          {register.isPending ? (
            <>
              <IconLoader2 className="size-4 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit for verification"
          )}
        </Button>
      </div>
    </form>
  );
}

// ── Internal sub-components ────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  error,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground sm:text-base">
          <span className="flex size-7 items-center justify-center rounded-md bg-niramoy-teal/10 text-niramoy-teal">
            {icon}
          </span>
          {title}
        </h2>
        {children}
        {error && <p className="text-[11px] text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Task 9: Post-submit banner shown after hospital is successfully registered.
 * Tells the user their profile is pending review.
 */
function PostSubmitBanner() {
  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardContent className="space-y-3 p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <IconCheck className="size-6" />
        </span>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Application received
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your hospital profile has been submitted for review. A system
            administrator will verify it within 2–3 business days. You can
            sign in at any time — you'll see a pending notice until approval.
          </p>
        </div>
        <div className="flex justify-center gap-2 pt-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild size="sm" className="bg-niramoy-teal text-white hover:bg-niramoy-teal/90">
            <Link href="/management">Go to dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
