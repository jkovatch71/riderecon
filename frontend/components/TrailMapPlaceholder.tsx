"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LatLngBounds,
  divIcon,
  type CircleMarker as LeafletCircleMarker,
} from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  Marker,
} from "react-leaflet";
import type { Trail } from "@/lib/types";
import { getConditionColor } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import {
  getFavorites,
  getRiderAssistRequests,
  respondToRiderAssistRequest,
  resolveRiderAssistRequest,
  type RiderAssistRequest,
} from "@/lib/api";

export type MapFilter = "rideable" | "assist" | "hazards" | "all";

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

const ASSIST_META: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  tire: { icon: "🛞", label: "Tire", color: "#f97316" },
  flat: { icon: "🛞", label: "Tire", color: "#f97316" },
  co2: { icon: "🛞", label: "Tire", color: "#f97316" },
  mechanical: { icon: "🔧", label: "Mechanical", color: "#38bdf8" },
  tool: { icon: "🔧", label: "Mechanical", color: "#38bdf8" },
  crash: { icon: "🚑", label: "Crash", color: "#ef4444" },
  other: { icon: "⚠️", label: "Other", color: "#f59e0b" },
};

const ASSIST_DETAIL_LABELS: Record<string, string> = {
  need_air: "Need Air",
  tube_patch: "Tube / Patch",
  plug_sealant: "Plug / Sealant",
  tire_off_bead: "Tire Off Bead",
  brakes: "Brakes",
  chain: "Chain",
  shifting: "Shifting",
  wheel_rotor: "Wheel / Rotor",
  cockpit: "Cockpit",
  minor_first_aid: "Minor First Aid",
  bike_check: "Bike Check",
  rider_help: "Rider Help",
  water: "Water",
  phone: "Phone",
  lost_rider: "Lost Rider",
  animal: "Animal",
  heat_issue: "Heat Issue",
  not_sure: "Not Sure",
  other: "Other",
};

function normalizeHazard(tag: string) {
  const key = tag.trim().toLowerCase();
  return HAZARD_META[key] ?? { icon: "⚠️", label: tag };
}

function getAssistDetailLabel(detail?: string | null) {
  if (!detail) return null;
  return ASSIST_DETAIL_LABELS[detail] ?? detail;
}

function getAssistMeta(type?: string | null) {
  if (!type) return ASSIST_META.other;
  return ASSIST_META[type] ?? ASSIST_META.other;
}

function getSummary(trail: Trail) {
  return trail.summary as TrailSummaryWithHazards | undefined;
}

function resolvedCondition(trail: Trail) {
  return (
    getSummary(trail)?.display_condition || trail.current_condition || "Unknown"
  );
}

function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number | null;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000,
      }
    );
  });
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

  if (
    normalized.includes("permanently closed") ||
    normalized.includes("closed")
  ) {
    return "#fb7185";
  }

  return null;
}

function rainSignalScore(condition?: string | null) {
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

function isPermanentlyClosedTrail(trail: Trail) {
  return resolvedCondition(trail).toLowerCase().includes("permanently closed");
}

const tombstoneIcon = divIcon({
  className: "",
  html: `
    <div style="
      width: 30px;
      height: 30px;
      display: grid;
      place-items: center;
      border-radius: 9999px;
      background: rgba(24,24,27,.92);
      border: 2px solid rgba(244,63,94,.85);
      box-shadow: 0 0 0 6px rgba(244,63,94,.12);
      font-size: 16px;
      line-height: 1;
    ">🪦</div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -12],
});

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
  const hasFitRef = useRef(false);

  useEffect(() => {
    if (hasFitRef.current) return;

    const validTrails = trails.filter(
      (trail) =>
        typeof trail.latitude === "number" &&
        typeof trail.longitude === "number"
    );

    if (!validTrails.length) return;

    hasFitRef.current = true;

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
          [trail.latitude as number, trail.longitude as number] as [
            number,
            number,
          ]
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
  mapFilter = "all",
}: {
  trails: Trail[];
  selectedTrailId?: string | null;
  mapFilter?: MapFilter;
}) {
  const { user, session, authLoading } = useAuth();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [assistRequests, setAssistRequests] = useState<RiderAssistRequest[]>(
    []
  );
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );

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

  const loadAssistRequests = useCallback(async () => {
    const requests = await getRiderAssistRequests().catch(
      (): RiderAssistRequest[] => []
    );
    setAssistRequests(requests);
  }, []);

  const handleLocated = useCallback((coords: [number, number]) => {
    setUserLocation(coords);
  }, []);

  async function handleRespondToAssistRequest(requestId: string) {
    if (!accessToken) return;

    const location = await getCurrentLocation();

    const result = await respondToRiderAssistRequest(
      requestId,
      {
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        location_accuracy_meters: location?.accuracy ?? null,
      },
      accessToken
    );

    setAssistRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? result.request : request
      )
    );
  }

  async function handleResolveAssistRequest(requestId: string) {
    if (!accessToken) return;

    const result = await resolveRiderAssistRequest(requestId, accessToken);

    setAssistRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? result.request : request
      )
    );
  }

  useEffect(() => {
    if (authLoading) return;
    void loadFavorites();
    void loadAssistRequests();
  }, [authLoading, loadFavorites, loadAssistRequests]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadFavorites();
        void loadAssistRequests();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadFavorites, loadAssistRequests]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadAssistRequests();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadAssistRequests]);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const validTrails = useMemo(
    () =>
      trails.filter(
        (trail) =>
          typeof trail.latitude === "number" &&
          typeof trail.longitude === "number"
      ),
    [trails]
  );

  const mapTrails = useMemo(() => {
    if (mapFilter !== "rideable") return validTrails;

    return validTrails.filter((trail) => {
      const condition = resolvedCondition(trail).toLowerCase();

      return (
        condition.includes("hero") ||
        condition === "dry" ||
        condition.includes("likely dry")
      );
    });
  }, [mapFilter, validTrails]);

  const rainBuckets = useMemo(() => buildRainBuckets(mapTrails), [mapTrails]);

  const activeAssistRequests = useMemo(
    () => assistRequests.filter((request) => request.status !== "resolved"),
    [assistRequests]
  );

  const hazardPoints = useMemo(
    () => getTrailHazardPoints(mapTrails),
    [mapTrails]
  );

  const showAssistLayer = mapFilter === "assist" || mapFilter === "all";
  const showHazardLayer = mapFilter === "hazards" || mapFilter === "all";

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

          <FitBounds trails={mapTrails} />

          <FocusSelectedTrail
            trails={mapTrails}
            selectedTrailId={selectedTrailId}
            markerRefs={markerRefs}
          />

          <LocateMe locateTrigger={locateTrigger} onLocated={handleLocated} />

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

          {showAssistLayer ? (
            <>
              {activeAssistRequests.map((request) => {
                if (
                  typeof request.latitude !== "number" ||
                  typeof request.longitude !== "number"
                ) {
                  return null;
                }

                const meta = getAssistMeta(request.assist_type);
                const detailLabel = getAssistDetailLabel(
                  request.assist_detail
                );

                return (
                  <Fragment key={request.id}>
                    {!request.responder_username ? (
                      <CircleMarker
                        interactive={false}
                        center={[request.latitude, request.longitude]}
                        radius={22}
                        pathOptions={{
                          color: meta.color,
                          fillColor: meta.color,
                          fillOpacity: 0.15,
                          weight: 0,
                        }}
                      />
                    ) : null}

                    <CircleMarker
                      center={[request.latitude, request.longitude]}
                      radius={request.responder_username ? 14 : 16}
                      pathOptions={{
                        color: meta.color,
                        fillColor: meta.color,
                        fillOpacity: 0.95,
                        weight: 3,
                      }}
                    >
                      <Popup>
                        <div className="min-w-[180px] max-w-[240px] leading-tight">
                          <p className="text-[13px] font-semibold uppercase text-zinc-900">
                            {meta.icon} Rider Assist
                          </p>

                          <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">
                            Tap to help this rider
                          </p>

                          <p className="mt-1 text-[12px] font-medium text-zinc-700">
                            {meta.label}
                          </p>

                          {detailLabel ? (
                            <p className="mt-1 text-[12px] font-semibold text-zinc-800">
                              {detailLabel}
                            </p>
                          ) : null}

                          {request.note ? (
                            <p className="mt-1.5 text-[12px] leading-snug text-zinc-700">
                              {request.note}
                            </p>
                          ) : null}

                          {request.responder_username ? (
                            <div className="mt-1.5 space-y-2">
                              <p className="rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                                {request.responder_username} responding
                              </p>

                              {accessToken ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleResolveAssistRequest(request.id)
                                  }
                                  className="w-full rounded-lg bg-zinc-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-100"
                                >
                                  Mark Resolved
                                </button>
                              ) : null}
                            </div>
                          ) : accessToken ? (
                            <button
                              type="button"
                              onClick={() =>
                                void handleRespondToAssistRequest(request.id)
                              }
                              className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white"
                            >
                              I&apos;m Responding
                            </button>
                          ) : (
                            <p className="mt-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
                              Sign in to respond
                            </p>
                          )}

                          <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">
                            @{request.username || "rider"}
                          </p>

                          {request.location_accuracy_meters ? (
                            <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">
                              GPS ±
                              {Math.round(request.location_accuracy_meters)}m
                            </p>
                          ) : null}
                        </div>
                      </Popup>
                    </CircleMarker>
                  </Fragment>
                );
              })}

              {activeAssistRequests.map((request) => {
                if (
                  typeof request.responder_latitude !== "number" ||
                  typeof request.responder_longitude !== "number"
                ) {
                  return null;
                }

                return (
                  <CircleMarker
                    key={`${request.id}-responder`}
                    center={[
                      request.responder_latitude,
                      request.responder_longitude,
                    ]}
                    radius={9}
                    pathOptions={{
                      color: "#ffffff",
                      fillColor: "#22c55e",
                      fillOpacity: 0.95,
                      weight: 3,
                    }}
                  >
                    <Popup>
                      <div className="min-w-[160px] leading-tight">
                        <p className="text-[13px] font-semibold uppercase text-zinc-900">
                          Responder
                        </p>
                        <p className="mt-1 text-[12px] text-zinc-700">
                          @{request.responder_username || "rider"} is responding
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </>
          ) : null}

          {showHazardLayer ? (
            <>
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
            </>
          ) : null}

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

          {mapTrails.map((trail) => {
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

            if (isPermanentlyClosedTrail(trail)) {
              return (
                <Marker key={trail.id} position={center} icon={tombstoneIcon}>
                  <Popup>
                    <div className="min-w-[175px] max-w-[220px] leading-tight">
                      <p className="font-trail text-[13px] font-semibold uppercase text-zinc-900">
                        🪦 {trail.name}
                      </p>

                      <p className="mt-1.5 text-[12px] font-medium text-rose-700">
                        Permanently Closed
                      </p>

                      <Link
                        href={`/trails/${trail.id}`}
                        className="mt-1.5 inline-block text-[12px] font-medium text-emerald-700 underline"
                      >
                        View details →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            }

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