"use client";

import Link from "next/link";
import { Trail } from "@/lib/types";
import { getFavorites } from "@/lib/api";
import { getConditionColor } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { LatLngBounds, type CircleMarker as LeafletCircleMarker } from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function markerColor(condition?: string) {
  const color = getConditionColor(condition);

  if (color === "green") return "#34d399";
  if (color === "yellow") return "#fbbf24";
  return "#fb7185";
}

function FitBounds({ trails }: { trails: Trail[] }) {
  const map = useMap();

  useEffect(() => {
    const validTrails = trails.filter(
      (trail) =>
        typeof trail.latitude === "number" &&
        typeof trail.longitude === "number"
    );

    if (!validTrails.length) return;

    if (validTrails.length === 1) {
      map.setView(
        [validTrails[0].latitude as number, validTrails[0].longitude as number],
        13
      );
      return;
    }

    const bounds = new LatLngBounds(
      validTrails.map(
        (trail) =>
          [trail.latitude as number, trail.longitude as number] as [number, number]
      )
    );

    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, trails]);

  return null;
}

function FocusSelectedTrail({
  trails,
  selectedTrailId,
  markerRefs,
}: {
  trails: Trail[];
  selectedTrailId?: string | null;
  markerRefs: React.MutableRefObject<Record<string, LeafletCircleMarker | null>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedTrailId) return;

    const selectedTrail = trails.find((trail) => trail.id === selectedTrailId);
    if (!selectedTrail?.latitude || !selectedTrail?.longitude) return;

    map.flyTo([selectedTrail.latitude, selectedTrail.longitude], 13, {
      duration: 0.8,
    });

    window.setTimeout(() => {
      markerRefs.current[selectedTrailId]?.openPopup();
    }, 350);
  }, [map, markerRefs, selectedTrailId, trails]);

  return null;
}

function LocateMe({
  locateTrigger,
  onLocated,
}: {
  locateTrigger: number;
  onLocated: (coords: [number, number]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!locateTrigger) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        onLocated(coords);
        map.flyTo(coords, 13, { duration: 0.8 });
      },
      () => {
        // leave silent for now; can add toast later
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [locateTrigger, map, onLocated]);

  return null;
}

export function TrailMapPlaceholder({
  trails,
  selectedTrailId,
}: {
  trails: Trail[];
  selectedTrailId?: string | null;
}) {
  const { user, session, authLoading } = useAuth();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const markerRefs = useRef<Record<string, LeafletCircleMarker | null>>({});

  const accessToken = session?.access_token;

  const loadFavorites = useCallback(async () => {
    if (!user || !accessToken) {
      setFavoriteIds([]);
      return;
    }

    const ids: string[] = await getFavorites(accessToken).catch(() => []);
    setFavoriteIds(ids);
  }, [user, accessToken]);

  useEffect(() => {
    if (authLoading) return;
    loadFavorites();
  }, [authLoading, loadFavorites]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadFavorites();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadFavorites]);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const validTrails = trails.filter(
    (trail) =>
      typeof trail.latitude === "number" &&
      typeof trail.longitude === "number"
  );

  if (!validTrails.length) {
    return (
      <div className="card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-section-title font-semibold">Map View</h2>
          <span className="text-helper text-zinc-400">No map data yet</span>
        </div>

        <p className="text-body text-zinc-300">
          None of your trails have coordinates available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-section-title font-semibold">Map View</h2>
        <span className="text-helper text-zinc-400">
          {validTrails.length} trail{validTrails.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setLocateTrigger((prev) => prev + 1)}
          className="btn-secondary absolute right-3 top-3 z-[1000]"
        >
          Locate me
        </button>

        <MapContainer
          center={[29.4241, -98.4936]}
          zoom={11}
          scrollWheelZoom={true}
          className="h-[65vh] min-h-[420px] w-full rounded-2xl"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds trails={validTrails} />
          <FocusSelectedTrail
            trails={validTrails}
            selectedTrailId={selectedTrailId}
            markerRefs={markerRefs}
          />
          <LocateMe
            locateTrigger={locateTrigger}
            onLocated={(coords) => setUserLocation(coords)}
          />

          {userLocation ? (
            <CircleMarker
              center={userLocation}
              radius={8}
              pathOptions={{
                color: "#e5e7eb",
                fillColor: "#60a5fa",
                fillOpacity: 0.95,
                weight: 3,
              }}
            >
              <Popup>You are here</Popup>
            </CircleMarker>
          ) : null}

          {validTrails.map((trail) => {
            const condition = trail.summary?.display_condition || trail.current_condition;
            const isFavorite = favoriteSet.has(trail.id);
            const isSelected = selectedTrailId === trail.id;
            const fill = markerColor(condition);
            const center: [number, number] = [
              trail.latitude as number,
              trail.longitude as number,
            ];

            return (
              <div key={trail.id}>
                {isFavorite ? (
                  <CircleMarker
                    center={center}
                    radius={18}
                    pathOptions={{
                      color: "#f8fafc",
                      fillColor: "#f8fafc",
                      fillOpacity: 0.12,
                      weight: 3,
                    }}
                  />
                ) : null}

                <CircleMarker
                  ref={(ref) => {
                    markerRefs.current[trail.id] = ref;
                  }}
                  center={center}
                  radius={isSelected ? 13 : 10}
                  pathOptions={{
                    color: isSelected ? "#ffffff" : "#18181b",
                    fillColor: fill,
                    fillOpacity: 0.95,
                    weight: isSelected ? 4 : 2,
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="font-trail text-section-title font-semibold uppercase break-words text-zinc-100">
                        {trail.name}
                        {isFavorite ? " ★" : ""}
                      </p>

                      {trail.system_name ? (
                        <p className="text-helper font-medium uppercase tracking-wide text-zinc-500">
                          {trail.system_name}
                        </p>
                      ) : null}

                      <p className="text-sm text-zinc-800">
                        Condition: {condition}
                      </p>

                      <Link
                        href={`/trails/${trail.id}`}
                        className="inline-block pt-1 text-sm font-medium text-emerald-700 underline"
                      >
                        View trail details
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              </div>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}