"use client";

/**
 * Hospital Registration form. The full spec:
 *   - Hospital full name
 *   - Division + District dropdowns (cascading)
 *   - Full address
 *   - Map pin picker — drag pin to precise location
 *   - Emergency + general phone
 *   - Facility type checkboxes (ICU / NICU / CCU / HDU) + capacity per type
 *   - Admin contact name + email + password
 *   - Submit → post-submit status banner
 *
 * Validates client-side, then runs an optimistic submit and renders the
 * confirmation banner. Real backend (POST /api/hospitals/register) can be
 * dropped in by replacing the `submitRegistration` body.
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
import { useDistricts } from "@/lib/use-districts";
import { cn } from "@/lib/utils";
import {
  ALL_BED_TYPES,
  ALL_DIVISIONS,
  type BangladeshDivision,
  type BedType,
} from "@/lib/types/hospital";

interface FormState {
  name: string;
  division: BangladeshDivision | "all";
  district: string;
  address: string;
  lat: number;
  lng: number;
  emergencyPhone: string;
  generalPhone: string;
  facilityTypes: BedType[];
  capacity: Record<BedType, number>;
  adminName: string;
  adminEmail: string;
  password: string;
}

const DEFAULT_CENTER: [number, number] = [90.399, 23.777];

const INITIAL: FormState = {
  name: "",
  division: "all",
  district: "",
  address: "",
  lat: DEFAULT_CENTER[1],
  lng: DEFAULT_CENTER[0],
  emergencyPhone: "",
  generalPhone: "",
  facilityTypes: [],
  capacity: { icu: 0, nicu: 0, ccu: 0, hdu: 0 },
  adminName: "",
  adminEmail: "",
  password: "",
};

const BED_LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

export function RegistrationForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );

  const districts = useDistricts(form.division);

  // Reset district if division changes.
  useEffect(() => {
    setForm((f) => ({ ...f, district: "" }));
  }, [form.division]);

  const enabledTypes = useMemo(
    () => new Set<BedType>(form.facilityTypes),
    [form.facilityTypes],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleFacility(t: BedType) {
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
    if (form.division === "all")
      next.division = "Please pick a division";
    if (!form.district) next.district = "Please pick a district";
    if (!form.address.trim()) next.address = "Address is required";
    if (!form.emergencyPhone.trim())
      next.emergencyPhone = "Emergency phone is required";
    if (!form.adminName.trim())
      next.adminName = "Admin contact name is required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.adminEmail))
      next.adminEmail = "Enter a valid email";
    if (form.password.length < 8)
      next.password = "Password must be at least 8 characters";
    if (form.facilityTypes.length === 0)
      next.facilityTypes = "Pick at least one facility type";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    // Stand-in for POST /api/hospitals/register. Real impl would send
    // { ...form } and show success based on response.
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return <PostSubmitBanner adminEmail={form.adminEmail} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Section title="Hospital details" icon={<IconBuildingHospital className="size-4" />}>
        <Field
          label="Hospital full name"
          error={errors.name}
        >
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
              value={form.division}
              onValueChange={(v) =>
                update("division", v as BangladeshDivision | "all")
              }
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
              disabled={form.division === "all"}
              onValueChange={(v) => update("district", v)}
            >
              <SelectTrigger
                className="h-9 w-full"
                aria-invalid={Boolean(errors.district)}
              >
                <SelectValue
                  placeholder={
                    form.division === "all" ? "Pick a division first" : "Choose a district"
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
          {ALL_BED_TYPES.map((t) => {
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

      <Section title="Admin contact" icon={<IconCheck className="size-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact name" error={errors.adminName}>
            <Input
              placeholder="Full name"
              className="h-9"
              value={form.adminName}
              onChange={(e) => update("adminName", e.target.value)}
              aria-invalid={Boolean(errors.adminName)}
            />
          </Field>
          <Field label="Email" error={errors.adminEmail}>
            <Input
              type="email"
              placeholder="you@hospital.bd"
              className="h-9"
              value={form.adminEmail}
              onChange={(e) => update("adminEmail", e.target.value)}
              aria-invalid={Boolean(errors.adminEmail)}
            />
          </Field>
        </div>
        <Field label="Password" error={errors.password}>
          <Input
            type="password"
            placeholder="At least 8 characters"
            className="h-9"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
        </Field>
      </Section>

      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted-foreground">
          By submitting, you agree that hospital staff will keep bed counts
          accurate and timely.
        </p>
        <Button
          type="submit"
          disabled={submitting}
          className="h-10 gap-1.5 bg-niramoy-teal px-5 text-sm text-white hover:bg-niramoy-teal/90"
        >
          {submitting ? (
            <>
              <IconLoader2 className="size-4 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit for Verification"
          )}
        </Button>
      </div>
    </form>
  );
}

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
        {error && (
          <p className="text-[11px] text-destructive">{error}</p>
        )}
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

function PostSubmitBanner({ adminEmail }: { adminEmail: string }) {
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
            A system administrator will review and approve your account
            within 2–3 business days. We sent a confirmation email to{" "}
            <span className="font-medium text-foreground">{adminEmail}</span>.
          </p>
        </div>
        <div className="flex justify-center gap-2 pt-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Go to login</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
