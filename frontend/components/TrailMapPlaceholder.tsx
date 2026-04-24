"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type HazardPoint = {
  id?: string;
  trail_id?: string;
  tags: string[];
  note?: string | null;
  latitude: number;
  longitude: number;
  accuracy_meters?: number | null;
  created_at?: string | null;
};

type TrailSummaryWithHazards = {
  display_condition?: string | null;
  display_status_color?: "green" | "yellow" | "red" | null;
  recent_hazards?: string[];
  hazard_points?: HazardPoint[];
};

const HAZARD_META: Record<string, { icon: string; label: string }> = {
  obstruction: { icon: "🌳", label: "Obstruction" },
  obstructed: { icon: "🌳", label: "Obstruction" },
  bees: { icon: "🐝", label: "Bees" },
  wildlife: { icon: "🐾", label: "Wildlife" },
  other: { icon: "⚠️", label: "Other" },
};

function normalizeHazard(tag: string) {
  const key = tag.trim().toLowerCase();
  return HAZARD_META[key] ?? { icon: "⚠️", label: tag };
}

function getSummary(trail: Trail) {
  return trail.summary as TrailSummaryWithHazards | undefined;
}

function resolvedCondition(trail: Trail) {
  return getSummary(trail)?.display_condition || trail.current_condition || "Unknown";
}

function markerColor(condition?: string | null) {
  const normalized = (condition || "").toLowerCase();

  if (normalized.includes("permanently closed")) return "#ef4444";
  if (normalized.includes("closed")) return "#fb7185";
  if (normalized.includes("flooded")) return "#f43f5e";
  if (normalized.includes("wet")) return "#f97316";

  const color = getConditionColor(condition || undefined);

  if (color === "green") return "#34d399";
  if (color === "yellow") return "#fbbf24";
  return "#fb7185";
}

function haloColor(condition?: string | null) {
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

function rainSignalScore(condition?: string | null) {
  const normalized = (condition || "").toLowerCase();

  if (normalized.includes("wet / unrideable") || normalized.includes("flooded")) {
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
    valid.reduce((sum, trail) => sum + (trail.latitude as number), 0) /
    valid.length;
  const avgLng =
    valid.reduce((sum, trail) => sum + (trail.longitude as number), 0) /
    valid.length;

  const grouped = new Map<
    string,
    { latSum: number; lngSum: number; scoreSum: number; trailCount: number }
  >();

  for (const trail of valid) {
    const lat = trail.latitude as number;
    const lng = trail.longitude as number;
    const condition = resolvedCondition(trail);
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

function getTrailHazardPoints(trails: Trail[]): HazardPoint[] {
  return trails.flatMap((trail) => {
    const points = getSummary(trail)?.hazard_points ?? [];

    return points
      .filter(
        (point) =>
          typeof point.latitude === "number" &&
          typeof point.longitude === "number" &&
          point.tags?.length
      )
      .map((point) => ({
        ...point,
        trail_id: point.trail_id || trail.id,
      }));
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
      () => {},
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
  const hazardPoints = useMemo(
    () => getTrailHazardPoints(validTrails),
    [validTrails]
  );

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
              interactive={false}
              center={bucket.center}
              radius={bucket.radius}
              pathOptions={{
                color: "#38bdf8",
                fillColor: "#38bdf8",
                fillOpacity: rainFillOpacity(bucket.score),
                weight: 0,
              }}
            />
          ))}

          {hazardPoints.map((point) => {
            const primary = normalizeHazard(point.tags[0]);

            return (
              <CircleMarker
                key={point.id ?? `${point.latitude}-${point.longitude}`}
                center={[point.latitude, point.longitude]}
                radius={12}
                pathOptions={{
                  color: "#f59e0b",
                  fillColor: "#f59e0b",
                  fillOpacity: 0.92,
                  weight: 3,
                }}
              >
                <Popup>
                  <div className="min-w-[170px] max-w-[220px] leading-tight">
                    <p className="text-[13px] font-semibold uppercase text-zinc-900">
                      {primary.icon} Trail hazard
                    </p>

                    <div className="mt-1 flex flex-wrap gap-1">
                      {point.tags.map((tag) => {
                        const meta = normalizeHazard(tag);

                        return (
                          <span
                            key={tag}
                            className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
                          >
                            {meta.icon} {meta.label}
                          </span>
                        );
                      })}
                    </div>

                    {point.note ? (
                      <p className="mt-1.5 text-[12px] leading-snug text-zinc-700">
                        {point.note}
                      </p>
                    ) : null}

                    {point.accuracy_meters ? (
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">
                        GPS ±{Math.round(point.accuracy_meters)}m
                      </p>
                    ) : null}

                    <Link
                      href={`/trails/${point.trail_id}`}
                      className="mt-1.5 inline-block text-[12px] font-medium text-emerald-700 underline"
                    >
                      View details →
                    </Link>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

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
                <div className="min-w-[120px] leading-tight">
                  <p className="text-[13px] font-semibold text-zinc-900">
                    You are here
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          ) : null}

          {validTrails.map((trail) => {
            const condition = resolvedCondition(trail);
            const hazards = getSummary(trail)?.recent_hazards ?? [];
            const isFavorite = favoriteSet.has(trail.id);
            const isSelected = selectedTrailId === trail.id;
            const fill = markerColor(condition);
            const conditionHalo = haloColor(condition);
            const halo: string | undefined = hazards.length
              ? "#f59e0b"
              : conditionHalo ?? undefined;

            const center: [number, number] = [
              trail.latitude as number,
              trail.longitude as number,
            ];

            return (
              <Fragment key={trail.id}>
                {halo ? (
                  <CircleMarker
                    interactive={false}
                    center={center}
                    radius={isSelected ? 27 : 22}
                    pathOptions={{
                      color: halo,
                      fillColor: halo,
                      fillOpacity: hazards.length ? 0.13 : 0.08,
                      weight: 0,
                    }}
                  />
                ) : null}

                {isFavorite ? (
                  <CircleMarker
                    interactive={false}
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
                    <div className="min-w-[175px] max-w-[220px] leading-tight">
                      <p className="font-trail text-[13px] font-semibold uppercase text-zinc-900">
                        {trail.name}
                        {isFavorite ? (
                          <span className="ml-1 text-yellow-500">★</span>
                        ) : null}
                      </p>

                      {trail.system_name ? (
                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          {trail.system_name}
                        </p>
                      ) : null}

                      <p className="mt-1.5 text-[12px] font-medium text-zinc-700">
                        Condition: {condition}
                      </p>

                      {hazards.length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {hazards.map((hazard) => {
                            const meta = normalizeHazard(hazard);

                            return (
                              <span
                                key={hazard}
                                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
                              >
                                {meta.icon} {meta.label}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}

                      <Link
                        href={`/trails/${trail.id}`}
                        className="mt-1.5 inline-block text-[12px] font-medium text-emerald-700 underline"
                      >
                        View details →
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              </Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}