"use client";

/**
 * Page-12 Update Hospital Profile. Editable fields:
 *   - Address (full street address)
 *   - Emergency phone + general phone (separately tappable on mobile)
 *   - Photo URL (or upload → base64 preview, with a Drag & Drop region)
 *   - About (short description, ≤ 280 chars)
 *   - Lat / lng via a draggable map pin (mirrors the registration form)
 *
 * The hospital name + division + district are locked at the auth level; they
 * only change via the registration re-verification flow. A locked notice sits
 * under the read-only Hospital header card.
 */

import { useMemo, useRef, useState } from "react";
import {
  IconBuildingHospital,
  IconCamera,
  IconDeviceFloppy,
  IconInfoCircle,
  IconLock,
  IconMapPin,
  IconPhoto,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToasts } from "@/components/ui/toast";
import { Map, MapMarker, MarkerContent, MapControls } from "@/components/ui/map";
import type { Hospital } from "@/lib/types/hospital";

interface Props {
  hospital: Hospital;
}

interface ProfileDraft {
  address: string;
  emergencyPhone: string;
  generalPhone: string;
  photoUrl: string;
  about: string;
  lat: number;
  lng: number;
}

const MAX_ABOUT = 280;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB cap for the inline preview.
const PHONE_RE = /^\+?[0-9]{6,15}$/;

export function UpdateProfileForm({ hospital }: Props) {
  const { pushToast } = useToasts();
  const [draft, setDraft] = useState<ProfileDraft>(() => ({
    address: hospital.address,
    emergencyPhone: hospital.phone,
    generalPhone: "",
    photoUrl: hospital.verified ? "" : "",
    about: "",
    lat: hospital.lat,
    lng: hospital.lng,
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileDraft, string>>>({});
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect changes vs the original hospital record so the "Save" button is
  // disabled until something actually changes.
  const base = useMemo<ProfileDraft>(
    () => ({
      address: hospital.address,
      emergencyPhone: hospital.phone,
      generalPhone: "",
      photoUrl: "",
      about: "",
      lat: hospital.lat,
      lng: hospital.lng,
    }),
    [hospital],
  );

  const changes = useMemo(() => {
    const keys: (keyof ProfileDraft)[] = [
      "address",
      "emergencyPhone",
      "generalPhone",
      "photoUrl",
      "about",
      "lat",
      "lng",
    ];
    return keys.filter((k) => draft[k] !== base[k]);
  }, [draft, base]);

  function update<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) {
      setErrors((e) => {
        const { [key]: _omit, ...rest } = e;
        return rest;
      });
    }
  }

  function setFromDrag(p: { lng: number; lat: number }) {
    setDraft((d) => ({ ...d, lng: p.lng, lat: p.lat }));
  }

  function applyPhotoFromFile(file: File) {
    if (!file.type.startsWith("image/")) {
      pushToast({
        title: "Unsupported file",
        description: "Please upload an image (JPG, PNG, or WebP).",
        variant: "error",
      });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      pushToast({
        title: "Photo is too large",
        description: `Max ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB.`,
        variant: "error",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        update("photoUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!draft.address.trim()) next.address = "Address is required";
    if (!draft.emergencyPhone.trim()) {
      next.emergencyPhone = "Emergency phone is required";
    } else if (!PHONE_RE.test(draft.emergencyPhone.replace(/\s+/g, ""))) {
      next.emergencyPhone = "Use E.164 format, e.g. +8801711000000";
    }
    if (
      draft.generalPhone.trim() &&
      !PHONE_RE.test(draft.generalPhone.replace(/\s+/g, ""))
    ) {
      next.generalPhone = "Use E.164 format, e.g. +8801711000000";
    }
    if (draft.about.length > MAX_ABOUT) {
      next.about = `Keep under ${MAX_ABOUT} characters`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (changes.length === 0) {
      pushToast({ title: "No changes to submit", variant: "info" });
      return;
    }
    if (!validate()) {
      pushToast({
        title: "Fix the errors above",
        variant: "error",
      });
      return;
    }
    // Stand-in for PATCH /api/hospitals/{id}/profile.
    await new Promise((r) => setTimeout(r, 500));
    pushToast({
      title: "Profile updated",
      description: "Changes are now live for patients.",
      variant: "success",
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
                <IconBuildingHospital className="size-4 text-niramoy-teal" />
                Hospital identity
              </h2>
              <p className="text-[11px] text-muted-foreground">
                These are tied to your registered account. To change them,
                contact a system admin.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <IconLock className="size-3" />
              Locked
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ReadOnlyField label="Hospital name" value={hospital.name} />
            <ReadOnlyField label="Division" value={hospital.division} />
            <ReadOnlyField label="District" value={hospital.district} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
              <IconMapPin className="size-4 text-niramoy-teal" />
              Address & contact
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Visible on the public hospital page and used for patient
              directions.
            </p>
          </div>

          <Field label="Full address" error={errors.address}>
            <Input
              placeholder="Street, area, postal code"
              className="h-9"
              value={draft.address}
              onChange={(e) => update("address", e.target.value)}
              aria-invalid={Boolean(errors.address)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Emergency phone" error={errors.emergencyPhone}>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="+8801XXXXXXXXX"
                className="h-9"
                value={draft.emergencyPhone}
                onChange={(e) => update("emergencyPhone", e.target.value)}
                aria-invalid={Boolean(errors.emergencyPhone)}
              />
              {draft.emergencyPhone && !errors.emergencyPhone && (
                <a
                  href={`tel:${draft.emergencyPhone.replace(/\s+/g, "")}`}
                  className="mt-1 inline-flex text-[10px] text-niramoy-teal underline-offset-2 hover:underline"
                >
                  Tap to dial
                </a>
              )}
            </Field>
            <Field label="General phone" error={errors.generalPhone}>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="+8801XXXXXXXXX (optional)"
                className="h-9"
                value={draft.generalPhone}
                onChange={(e) => update("generalPhone", e.target.value)}
                aria-invalid={Boolean(errors.generalPhone)}
              />
              {draft.generalPhone && !errors.generalPhone && (
                <a
                  href={`tel:${draft.generalPhone.replace(/\s+/g, "")}`}
                  className="mt-1 inline-flex text-[10px] text-niramoy-teal underline-offset-2 hover:underline"
                >
                  Tap to dial
                </a>
              )}
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
              <IconCamera className="size-4 text-niramoy-teal" />
              Photo
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Used as the cover image on your public page. Square images work
              best.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <div className="flex aspect-square w-full max-w-[120px] items-center justify-center overflow-hidden rounded-md border bg-muted/40 text-muted-foreground">
              {draft.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.photoUrl}
                  alt={`${hospital.name} preview`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <IconPhoto className="size-8" aria-hidden />
              )}
            </div>

            <div className="space-y-2">
              <Field label="Photo URL" hint="Paste a hosted image URL or upload below.">
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  className="h-9"
                  value={
                    draft.photoUrl.startsWith("data:") ? "" : draft.photoUrl
                  }
                  onChange={(e) => update("photoUrl", e.target.value)}
                />
              </Field>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) applyPhotoFromFile(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IconUpload className="size-3.5" />
                  Upload image
                </Button>
                {draft.photoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => update("photoUrl", "")}
                  >
                    <IconTrash className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>

              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingPhoto(true);
                }}
                onDragLeave={() => setIsDraggingPhoto(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingPhoto(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) applyPhotoFromFile(file);
                }}
                className={`flex h-16 cursor-pointer items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground transition-colors ${
                  isDraggingPhoto
                    ? "border-niramoy-teal bg-niramoy-teal/5 text-niramoy-teal"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
              >
                Drag a photo here, or click “Upload image” above
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
              <IconInfoCircle className="size-4 text-niramoy-teal" />
              About
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Shown on the public page. A couple of sentences is enough.
            </p>
          </div>

          <Field
            label="Description"
            hint={`${draft.about.length} / ${MAX_ABOUT} characters`}
            error={errors.about}
          >
            <textarea
              rows={4}
              maxLength={MAX_ABOUT + 50}
              placeholder="A 50-year-old public hospital serving north Dhaka with…"
              className="border-input bg-input/20 ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 min-h-20 w-full rounded-md border px-3 py-2 text-xs leading-relaxed outline-none aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed dark:bg-input/30"
              value={draft.about}
              onChange={(e) => update("about", e.target.value)}
              aria-invalid={Boolean(errors.about)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
              <IconMapPin className="size-4 text-niramoy-teal" />
              Pin location
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Drag the pin to correct the position shown on the public map.
            </p>
          </div>

          <div className="relative h-64 w-full overflow-hidden rounded-md border">
            <Map center={[draft.lng, draft.lat]} zoom={12} fadeDuration={0}>
              <MapMarker
                longitude={draft.lng}
                latitude={draft.lat}
                draggable
                onDragEnd={setFromDrag}
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
          <p className="font-mono text-[10px] text-muted-foreground">
            {draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}
          </p>
        </CardContent>
      </Card>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={changes.length === 0}
        className="h-10 w-full gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
      >
        <IconDeviceFloppy className="size-3.5" />
        Save Profile
        {changes.length > 0 && (
          <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold">
            {changes.length}
          </span>
        )}
      </Button>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm text-foreground">
        {value}
      </div>
    </div>
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
