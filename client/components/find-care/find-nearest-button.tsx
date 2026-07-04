"use client";

import { Button } from "@/components/ui/button";
import { IconMapPin, IconLoader2 } from "@tabler/icons-react";
import type {
  FilterAction,
  GeoStatus,
} from "@/app/app/find-care/filters";

interface Props {
  geoStatus: GeoStatus;
  dispatch: React.Dispatch<FilterAction>;
}

export function FindNearestButton({ geoStatus, dispatch }: Props) {
  const loading = geoStatus === "loading";

  function handleClick() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      dispatch({ type: "SET_GEO_STATUS", status: "error" });
      return;
    }
    dispatch({ type: "SET_GEO_STATUS", status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        dispatch({
          type: "SET_USER_COORDS",
          coords: [pos.coords.longitude, pos.coords.latitude],
        });
        dispatch({ type: "SET_GEO_STATUS", status: "ok" });
        dispatch({ type: "SET_SORT", sort: "nearest" });
      },
      (err) => {
        // code 1 = permission denied; anything else surfaces as "error"
        dispatch({
          type: "SET_GEO_STATUS",
          status: err.code === 1 ? "denied" : "error",
        });
        dispatch({ type: "SET_USER_COORDS", coords: null });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }

  return (
    <Button
      type="button"
      className="w-full bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <>
          <IconLoader2 className="animate-spin" />
          Locating…
        </>
      ) : (
        <>
          <IconMapPin />
          Find Nearest Hospital
        </>
      )}
    </Button>
  );
}
