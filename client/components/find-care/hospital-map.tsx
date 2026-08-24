"use client"

import { useEffect, useMemo } from "react"
import {
  Map,
  MapClusterLayer,
  MapControls,
  MapMarker,
  MapPopup,
  MarkerContent,
  useMap,
} from "@/components/ui/map"
import {
  buildAvailabilityPaintExpression,
  hospitalsToFeatureCollection,
} from "@/lib/hospital-utils"
import { MapPopupContent } from "@/components/find-care/map-popup-content"
import type {
  Hospital,
  HospitalFeatureCollection,
  HospitalProperties,
} from "@/lib/types/hospital"
import type { FilterAction } from "@/lib/filters"

interface Props {
  hospitals: Hospital[]
  hoveredId: string | null
  selectedHospital: Hospital | null
  userCoords: [number, number] | null
  onPointClick: (h: Hospital) => void
  dispatch: React.Dispatch<FilterAction>
}

/**
 * Listens to the selected hospital and pans the underlying map. Must live
 * inside `<Map>` so `useMap()` resolves to the right context.
 */
function FlyToSelected({ hospital }: { hospital: Hospital | null }) {
  const { map, isLoaded } = useMap()
  useEffect(() => {
    if (!isLoaded || !map || !hospital) return
    map.flyTo({
      center: [hospital.lng, hospital.lat],
      zoom: 12,
      duration: 800,
    })
    // Intentionally excludes `map` from deps — the ref is stable while
    // isLoaded is true; we only want to react to hospital change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospital?.id, isLoaded])
  return null
}

/**
 * Re-centers the map to the user's coordinates the first time geolocation is
 * granted. Subsequent user-pin renders do not re-fly.
 */
function FlyToUser({ coords }: { coords: [number, number] | null }) {
  const { map, isLoaded } = useMap()
  useEffect(() => {
    if (!isLoaded || !map || !coords) return
    map.flyTo({
      center: coords,
      zoom: 10,
      duration: 800,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, coords?.[0], coords?.[1]])
  return null
}

export function HospitalMap({
  hospitals,
  hoveredId,
  selectedHospital,
  userCoords,
  onPointClick,
}: Props) {
  // Stable paint expression — one `match` per feature, cheap.
  const pointColorExpression = useMemo(
    () => buildAvailabilityPaintExpression() as never,
    []
  )

  const featureCollection: HospitalFeatureCollection = useMemo(
    () => hospitalsToFeatureCollection(hospitals),
    [hospitals]
  )

  // Map stable hospital ids to numeric feature ids assigned by `generateId`.
  // MapLibre assigns IDs in the order features are written, which matches the
  // iteration order of `hospitals` here. The result-card hovers use this to
  // look up the corresponding feature for setFeatureState.
  const hoveredFeatureId = useMemo(() => {
    if (!hoveredId) return null
    const idx = hospitals.findIndex((h) => h.id === hoveredId)
    return idx >= 0 ? idx : null
  }, [hospitals, hoveredId])

  return (
    <Map
      center={[90.399, 23.777]}
      zoom={6.8}
      fadeDuration={0}
      attributionControl={false}
    >
      <MapClusterLayer<HospitalProperties>
        data={featureCollection}
        clusterRadius={50}
        clusterMaxZoom={14}
        pointColorExpression={pointColorExpression}
        hoveredId={hoveredFeatureId}
        onPointClick={(feature) => {
          onPointClick(feature.properties)
        }}
      />

      <FlyToSelected hospital={selectedHospital} />
      <FlyToUser coords={userCoords} />

      {userCoords && (
        <MapMarker longitude={userCoords[0]} latitude={userCoords[1]}>
          <MarkerContent>
            <div
              className="h-4 w-4 rounded-full border-2 border-white shadow-lg"
              style={{
                backgroundColor: "#0E9E8E",
                boxShadow: "0 0 0 4px rgba(14,158,142,0.25)",
              }}
            />
          </MarkerContent>
        </MapMarker>
      )}

      {selectedHospital && (
        <MapPopup
          key={selectedHospital.id}
          longitude={selectedHospital.lng}
          latitude={selectedHospital.lat}
          onClose={() => onPointClick(selectedHospital)}
          closeOnClick={false}
          focusAfterOpen={false}
          closeButton
          offset={20}
          className="w-[22rem] sm:w-[24rem]"
        >
          <MapPopupContent hospital={selectedHospital} />
        </MapPopup>
      )}

      <MapControls />
    </Map>
  )
}
