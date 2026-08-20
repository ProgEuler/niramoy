"use client"

import { useMemo, useRef, useState } from "react"
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
} from "@tabler/icons-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToasts } from "@/components/ui/toast"
import { Map, MapMarker, MarkerContent, MapControls } from "@/components/ui/map"
import { useAuth } from "@/lib/auth/use-auth"
import {
  patchMyHospitalProfile,
  type MyHospitalProfile as ApiProfile,
  type MyHospitalProfileUpdate,
} from "@/lib/api/hospital-admin"
import { myHospitalKeys } from "@/lib/hooks/use-my-hospital"
import type { Hospital } from "@/lib/types/hospital"

interface Props {
  hospital: Hospital
}

interface ProfileDraft {
  address: string
  emergencyPhone: string
  generalPhone: string
  photoUrl: string
  about: string
  lat: number
  lng: number
}

const MAX_ABOUT = 280
const MAX_PHOTO_BYTES = 2 * 1024 * 1024 // 2 MB cap for the inline preview.
const PHONE_RE = /^\+?[0-9]{6,15}$/

export function UpdateProfileForm({ hospital }: Props) {
  const { pushToast } = useToasts()
  const queryClient = useQueryClient()
  const { accessToken } = useAuth()

  const [draft, setDraft] = useState<ProfileDraft>(() => ({
    address: hospital.address,
    emergencyPhone: hospital.phone,
    generalPhone: "",
    photoUrl: "",
    about: "",
    lat: hospital.lat,
    lng: hospital.lng,
  }))
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProfileDraft, string>>
  >({})
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // The "before" snapshot we diff against on save. Rebased to the latest
  // server values on success so the diff clears.
  const [base, setBase] = useState<ProfileDraft>(() => ({
    address: hospital.address,
    emergencyPhone: hospital.phone,
    generalPhone: "",
    photoUrl: "",
    about: "",
    lat: hospital.lat,
    lng: hospital.lng,
  }))

  const changes = useMemo(() => {
    const keys: (keyof ProfileDraft)[] = [
      "address",
      "emergencyPhone",
      "generalPhone",
      "photoUrl",
      "about",
      "lat",
      "lng",
    ]
    return keys.filter((k) => draft[k] !== base[k])
  }, [draft, base])

  function update<K extends keyof ProfileDraft>(
    key: K,
    value: ProfileDraft[K]
  ) {
    setDraft((d) => ({ ...d, [key]: value }))
    if (errors[key]) {
      setErrors((e) => {
        const { [key]: _omit, ...rest } = e
        return rest
      })
    }
  }

  function setFromDrag(p: { lng: number; lat: number }) {
    setDraft((d) => ({ ...d, lng: p.lng, lat: p.lat }))
  }

  function applyPhotoFromFile(file: File) {
    if (!file.type.startsWith("image/")) {
      pushToast({
        title: "Unsupported file",
        description: "Please upload an image (JPG, PNG, or WebP).",
        variant: "error",
      })
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      pushToast({
        title: "Photo is too large",
        description: `Max ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB.`,
        variant: "error",
      })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        update("photoUrl", reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  function validate(): boolean {
    const next: typeof errors = {}
    if (!draft.address.trim()) next.address = "Address is required"
    if (!draft.emergencyPhone.trim()) {
      next.emergencyPhone = "Emergency phone is required"
    } else if (!PHONE_RE.test(draft.emergencyPhone.replace(/\s+/g, ""))) {
      next.emergencyPhone = "Use E.164 format, e.g. +8801711000000"
    }
    if (
      draft.generalPhone.trim() &&
      !PHONE_RE.test(draft.generalPhone.replace(/\s+/g, ""))
    ) {
      next.generalPhone = "Use E.164 format, e.g. +8801711000000"
    }
    if (draft.about.length > MAX_ABOUT) {
      next.about = `Keep under ${MAX_ABOUT} characters`
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // PATCH /api/hospital/profile — JWT-scoped to the admin's own hospital.
  // Build the payload from only the dirty fields so the backend's
  // exclude_unset semantics keep unrelated columns untouched.
  const mutation = useMutation<ApiProfile, Error, MyHospitalProfileUpdate>({
    mutationFn: (payload) => {
      if (!accessToken) {
        throw new Error("Not signed in. Please log in again.")
      }
      return patchMyHospitalProfile(payload, { token: accessToken })
    },
    onSuccess: (result) => {
      // Rebase both draft and base to the new server values so the diff
      // clears and the next edit starts from the freshly-saved state.
      const nextBase: ProfileDraft = {
        address: result.address,
        emergencyPhone: result.phone_emergency ?? "",
        generalPhone: result.phone_general ?? "",
        photoUrl: result.photo_url ?? "",
        about: result.description ?? "",
        lat: result.latitude ?? hospital.lat,
        lng: result.longitude ?? hospital.lng,
      }
      setBase(nextBase)
      setDraft(nextBase)
      setErrors({})
      // Refresh anything subscribed to the admin's own hospital row.
      queryClient.invalidateQueries({ queryKey: myHospitalKeys.all })
      pushToast({
        title: "Profile updated",
        description: "Changes are now live for patients.",
        variant: "success",
      })
    },
    onError: (err) => {
      pushToast({
        title: "Couldn't save profile",
        description: err.message || "Please try again.",
        variant: "error",
      })
    },
  })

  async function handleSubmit() {
    if (changes.length === 0) {
      pushToast({ title: "No changes to submit", variant: "info" })
      return
    }
    if (!validate()) {
      pushToast({
        title: "Fix the errors above",
        variant: "error",
      })
      return
    }

    // Map dirty draft fields → backend payload keys. Only the fields that
    // actually changed are included so the backend's exclude_unset leaves
    // everything else alone.
    const payload: MyHospitalProfileUpdate = {}
    if (draft.address !== base.address) payload.address = draft.address.trim()
    if (draft.emergencyPhone !== base.emergencyPhone)
      payload.phone_emergency = draft.emergencyPhone.trim()
    if (draft.generalPhone !== base.generalPhone)
      payload.phone_general = draft.generalPhone.trim() || null
    if (draft.about !== base.about) payload.description = draft.about
    if (draft.photoUrl !== base.photoUrl)
      payload.photo_url = draft.photoUrl || null
    if (draft.lat !== base.lat || draft.lng !== base.lng) {
      payload.latitude = draft.lat
      payload.longitude = draft.lng
    }

    mutation.mutate(payload)
  }

  return (
    <div className="space-y-4 grid md:grid-cols-2 gap-4 sm:grid-cols-1">
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
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
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
              disabled={mutation.isPending}
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
                disabled={mutation.isPending}
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
                disabled={mutation.isPending}
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
              className="min-h-20 w-full rounded-md border border-input bg-input/20 px-3 py-2 text-xs leading-relaxed ring-offset-background outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed dark:bg-input/30"
              value={draft.about}
              onChange={(e) => update("about", e.target.value)}
              aria-invalid={Boolean(errors.about)}
              disabled={mutation.isPending}
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
            <Map
              center={[draft.lng, draft.lat]}
              zoom={12}
              fadeDuration={0}
              attributionControl={false}
            >
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
        disabled={changes.length === 0 || mutation.isPending}
        className="h-10 w-full gap-1.5 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
      >
        <IconDeviceFloppy className="size-3.5" />
        {mutation.isPending ? "Saving…" : "Save Profile"}
        {changes.length > 0 && !mutation.isPending && (
          <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold">
            {changes.length}
          </span>
        )}
      </Button>
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </label>
      <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm text-foreground">
        {value}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string
  children: React.ReactNode
  error?: string
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}
