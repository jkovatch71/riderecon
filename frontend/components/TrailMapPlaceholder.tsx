"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LatLngBounds, type CircleMarker as LeafletCircleMarker } from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { Trail } from "@/lib/types";
import { getFavorites } from "@/lib/api";
import { getConditionColor } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

type RainBucket = {
  key: string;
  center: [number, number];
  score: number;
  radius: number;
  trailCount: number;
};

function markerColor(condition?: string) {
  const normalized = (condition || "").toLowerCase();

  if (normalized.includes("permanently closed")) return "#ef4444";
  if (normalized.includes("closed")) return "#fb7185";
  if (normalized.includes("flooded")) return "#f43f5e";
  if (normalized.includes("wet")) return "#f97316";

  const color = getConditionColor(condition);

  if (color === "green") return "#34d399";
  if (color === "yellow") return "#fbbf24";
  return "#fb7185";
}

function haloColor(condition?: string) {
  const normalized = (condition || "").toLowerCase();

  if (
    normalized.includes("wet") ||
    normalized.includes("flooded") ||
    normalized.includes("muddy") ||
    normalized.includes("needs more time")
  ) {
    return "#60a5fa";
  }

  if (normalized.includes("damp")) return "#38bdf8";
  if (normalized.includes("permanently closed") || normalized.includes("closed")) {
    return "#fb7185";
  }

  return null;
}

function rainSignalScore(condition?: string) {
  const normalized = (condition || "").toLowerCase();

  if (
    normalized.includes("wet / unrideable") ||
    normalized.includes("flooded")
  ) {
    return 1;
  }

  if (normalized.includes("muddy") || normalized.includes("needs more time")) {
    return 0.8;
  }

  if (normalized.includes("damp") || normalized.includes("likely wet")) {
    return 0.45;
  }

  return 0;
}

function rainFillOpacity(score: number) {
  if (score >= 0.85) return 0.18;
  if (score >= 0.6) return 0.14;
  if (score >= 0.35) return 0.1;
  return 0.07;
}

function rainRadius(score: number, trailCount: number) {
  const base = score >= 0.85 ? 3400 : score >= 0.6 ? 2800 : 2200;
  return base + Math.min(trailCount * 180, 900);
}

function buildRainBuckets(trails: Trail[]): RainBucket[] {
  const valid = trails.filter(
    (trail) =>
      typeof trail.latitude === "number" &&
      typeof trail.longitude === "number"
  );

  if (!valid.length) return [];

  const avgLat =
    valid.reduce((sum, trail) => sum + (trail.latitude as number), 0) / valid.length;
  const avgLng =
    valid.reduce((sum, trail) => sum + (trail.longitude as number), 0) / valid.length;

  const grouped = new Map<
    string,
    { latSum: number; lngSum: number; scoreSum: number; trailCount: number }
  >();

  for (const trail of valid) {
    const lat = trail.latitude as number;
    const lng = trail.longitude as number;
    const condition = trail.summary?.display_condition || trail.current_condition;
    const score = rainSignalScore(condition);

    if (score <= 0) continue;

    const vertical = lat >= avgLat ? "north" : "south";
    const horizontal = lng >= avgLng ? "east" : "west";
    const key = `${vertical}-${horizontal}`;

    const current = grouped.get(key) ?? {
      latSum: 0,
      lngSum: 0,
      scoreSum: 0,
      trailCount: 0,
    };

    current.latSum += lat;
    current.lngSum += lng;
    current.scoreSum += score;
    current.trailCount += 1;

    grouped.set(key, current);
  }

  return Array.from(grouped.entries()).map(([key, value]) => {
    const avgScore = value.scoreSum / value.trailCount;

    return {
      key,
      center: [
        value.latSum / value.trailCount,
        value.lngSum / value.trailCount,
      ],
      score: avgScore,
      radius: rainRadius(avgScore, value.trailCount),
      trailCount: value.trailCount,
    };
  });
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

    const timer = window.setTimeout(() => {
      markerRefs.current[selectedTrailId]?.openPopup();
    }, 350);

    return () => window.clearTimeout(timer);
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
        // silent for now
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
    void loadFavorites();
  }, [authLoading, loadFavorites]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadFavorites();
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

  const rainBuckets = useMemo(() => buildRainBuckets(validTrails), [validTrails]);

  if (!validTrails.length) {
    return (
      <div className="card p-4">
        <p className="text-body text-zinc-300">
          None of your trails have coordinates available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
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

          {rainBuckets.map((bucket) => (
            <Circle
              key={bucket.key}
              center={bucket.center}
              radius={bucket.radius}
              pathOptions={{
                color: "#38bdf8",
                fillColor: "#38bdf8",
                fillOpacity: rainFillOpacity(bucket.score),
                weight: 0,
              }}
            >
              <Popup>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-zinc-900">
                    Weather signal
                  </p>
                  <p className="text-xs text-zinc-700">
                    {bucket.trailCount} nearby trail
                    {bucket.trailCount === 1 ? "" : "s"} showing wetter conditions.
                  </p>
                </div>
              </Popup>
            </Circle>
          ))}

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
              <Popup>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900">You are here</p>
                </div>
              </Popup>
            </CircleMarker>
          ) : null}

          {validTrails.map((trail) => {
            const condition =
              trail.summary?.display_condition || trail.current_condition;
            const isFavorite = favoriteSet.has(trail.id);
            const isSelected = selectedTrailId === trail.id;
            const fill = markerColor(condition);
            const halo = haloColor(condition);
            const center: [number, number] = [
              trail.latitude as number,
              trail.longitude as number,
            ];

            return (
              <div key={trail.id}>
                {halo ? (
                  <CircleMarker
                    center={center}
                    radius={isSelected ? 26 : 22}
                    pathOptions={{
                      color: halo,
                      fillColor: halo,
                      fillOpacity: isSelected ? 0.12 : 0.08,
                      weight: 0,
                    }}
                  />
                ) : null}

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
                    <div className="space-y-1.5">
                      <p className="font-trail text-section-title break-words font-semibold uppercase text-zinc-900">
                        {trail.name}
                        {isFavorite ? " ★" : ""}
                      </p>

                      {trail.system_name ? (
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                          {trail.system_name}
                        </p>
                      ) : null}

                      <p className="text-sm font-medium text-zinc-700">
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