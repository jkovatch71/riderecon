"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Layers, LifeBuoy, List, Map, Plus, Star } from "lucide-react";
import type { Trail } from "@/lib/types";
import { TrailList } from "@/components/TrailList";
import dynamic from "next/dynamic";
import { FavoritesManager } from "@/components/FavoritesManager";
import { QuickReportModal } from "@/components/QuickReportModal";
import type { MapFilter } from "@/components/TrailMapPlaceholder";
import { useAuth } from "@/components/AuthProvider";

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TrailMapPlaceholder = dynamic(
  () =>
    import("@/components/TrailMapPlaceholder").then(
      (mod) => mod.TrailMapPlaceholder
    ),
  {
    ssr: false,
    loading: () => (
      <div className="card p-4">
        <div className="h-[65vh] min-h-[420px] w-full rounded-2xl bg-zinc-900/40" />
      </div>
    ),
  }
);

const QUICK_REPORT_SNAP_DISTANCE_METERS = 1609; // 1 mile

type Props = {
  trails: Trail[];
};

export function TrailsPageClient({ trails }: Props) {
  const searchParams = useSearchParams();
  const { session, authLoading } = useAuth();

  const selectedTrailId = searchParams.get("selected");

  const [mapFilter, setMapFilter] = useState<MapFilter>("all");
  const [reportOpen, setReportOpen] = useState(false);
  const [locatingTrail, setLocatingTrail] = useState(true);
  const [selectedReportTrail, setSelectedReportTrail] = useState<Trail | null>(
    null
  );
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocatingTrail(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocatingTrail(false);
      },
      () => {
        setLocatingTrail(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      }
    );
  }, []);

  const currentView = useMemo(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "map") return "map";
    if (viewParam === "favorites") return "favorites";
    return "list";
  }, [searchParams]);

  const listHref = "/trails?view=list";
  const mapHref = selectedTrailId
    ? `/trails?view=map&selected=${encodeURIComponent(selectedTrailId)}`
    : "/trails?view=map";
  const favoritesHref = "/trails?view=favorites";
  const quickReportTarget = useMemo(() => {
    if (!trails.length) {
      return {
        trail: null as Trail | null,
        distanceMeters: null as number | null,
        source: "none" as const,
        withinSnapRange: false,
      };
    }

    if (selectedReportTrail) {
      return {
        trail: selectedReportTrail,
        distanceMeters: null,
        source: "selected" as const,
        withinSnapRange: true,
      };
    }

    if (selectedTrailId) {
      const selectedTrail =
        trails.find((trail) => trail.id === selectedTrailId) ?? null;

      return {
        trail: selectedTrail,
        distanceMeters: null,
        source: "selected" as const,
        withinSnapRange: true,
      };
    }

    if (userLocation) {
      let closestTrail: Trail | null = null;
      let closestDistanceMeters = Infinity;

      for (const trail of trails) {
        if (
          typeof trail.latitude !== "number" ||
          typeof trail.longitude !== "number"
        ) {
          continue;
        }

        const distanceMeters = getDistanceMeters(
          userLocation.lat,
          userLocation.lng,
          trail.latitude,
          trail.longitude
        );

        if (distanceMeters < closestDistanceMeters) {
          closestDistanceMeters = distanceMeters;
          closestTrail = trail;
        }
      }

      return {
        trail: closestTrail,
        distanceMeters: Number.isFinite(closestDistanceMeters)
          ? closestDistanceMeters
          : null,
        source: "nearest" as const,
        withinSnapRange:
          Number.isFinite(closestDistanceMeters) &&
          closestDistanceMeters <= QUICK_REPORT_SNAP_DISTANCE_METERS,
      };
    }

    return {
      trail: trails[0],
      distanceMeters: null,
      source: "fallback" as const,
      withinSnapRange: true,
    };
  }, [selectedReportTrail, selectedTrailId, trails, userLocation]);

  const quickReportTrail = quickReportTarget.trail;

  return (
    <div className="space-y-3">
      <div className="card p-1.5">
        <div className="relative grid grid-cols-3 gap-2">
          <div
            className={`pointer-events-none absolute bottom-0 top-0 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/40 transition-all duration-300 ease-out ${
              currentView === "list"
                ? "left-0 w-[calc(33.333%-0.34rem)]"
                : currentView === "map"
                  ? "left-[calc(33.333%+0.16rem)] w-[calc(33.333%-0.32rem)]"
                  : "left-[calc(66.666%+0.32rem)] w-[calc(33.333%-0.34rem)]"
            }`}
          />

          <Link
            href={listHref}
            className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              currentView === "list"
                ? "text-emerald-300"
                : "text-zinc-400 active:scale-[0.98]"
            }`}
            aria-current={currentView === "list" ? "page" : undefined}
          >
            <List className="h-4 w-4" />
            <span>List</span>
          </Link>

          <Link
            href={mapHref}
            className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              currentView === "map"
                ? "text-emerald-300"
                : "text-zinc-400 active:scale-[0.98]"
            }`}
            aria-current={currentView === "map" ? "page" : undefined}
          >
            <Map className="h-4 w-4" />
            <span>Map</span>
          </Link>

          <Link
            href={favoritesHref}
            className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              currentView === "favorites"
                ? "text-emerald-300"
                : "text-zinc-400 active:scale-[0.98]"
            }`}
            aria-current={currentView === "favorites" ? "page" : undefined}
          >
            <Star className="h-4 w-4" />
            <span>Favorites</span>
          </Link>
        </div>
      </div>

      {currentView === "map" ? (
        <>
          <div className="card p-1.5">
            <div className="relative grid grid-cols-3 gap-2">
              <div
                className={`pointer-events-none absolute bottom-0 top-0 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/40 transition-all duration-300 ease-out ${
                  mapFilter === "all"
                    ? "left-0 w-[calc(33.333%-0.34rem)]"
                    : mapFilter === "assist"
                      ? "left-[calc(33.333%+0.16rem)] w-[calc(33.333%-0.32rem)]"
                      : "left-[calc(66.666%+0.32rem)] w-[calc(33.333%-0.34rem)]"
                }`}
              />

              <button
                type="button"
                onClick={() => setMapFilter("all")}
                className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  mapFilter === "all"
                    ? "text-emerald-300"
                    : "text-zinc-400 active:scale-[0.98]"
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>All</span>
              </button>

              <button
                type="button"
                onClick={() => setMapFilter("assist")}
                className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  mapFilter === "assist"
                    ? "text-emerald-300"
                    : "text-zinc-400 active:scale-[0.98]"
                }`}
              >
                <LifeBuoy className="h-4 w-4" />
                <span>Assist</span>
              </button>

              <button
                type="button"
                onClick={() => setMapFilter("hazards")}
                className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  mapFilter === "hazards"
                    ? "text-emerald-300"
                    : "text-zinc-400 active:scale-[0.98]"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Hazards</span>
              </button>
            </div>
          </div>

          <div className="relative">
            {session ? (
            <button
              type="button"
              onClick={() => {
                if (quickReportTrail) {
                  setSelectedReportTrail(quickReportTrail);
                }
                setReportOpen(true);
              }}
              disabled={!quickReportTrail || locatingTrail || authLoading || !session}
              className="fixed bottom-24 right-5 z-[1500] flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400 text-zinc-950 shadow-[0_0_30px_rgba(52,211,153,0.28)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Quick report"
              title={
                !session
                  ? "Sign in to submit trail reports"
                  : locatingTrail
                    ? "Locating nearest trail..."
                    : quickReportTrail
                      ? `Quick report: ${quickReportTrail.name}`
                      : "Quick report unavailable"
              }
            >
              {locatingTrail ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />
              ) : (
                <Plus className="h-7 w-7 stroke-[2.5]" />
              )}
            </button>
            ) : null}

            {!authLoading && !session ? (
              <Link
                href="/auth/login?next=/trails?view=map"
                className="mt-3 flex items-center justify-between rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 shadow-lg transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/50 bg-zinc-950/70 text-lg">
                    🔒
                  </span>

                  <div className="leading-tight">
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-amber-300">
                      Sign in to report
                    </p>
                    <p className="mt-0.5 text-[12px] text-zinc-400">
                      Help keep trail conditions current.
                    </p>
                  </div>
                </div>

                <span className="text-2xl leading-none text-amber-300">›</span>
              </Link>
            ) : null}

            <TrailMapPlaceholder
              trails={trails}
              selectedTrailId={selectedTrailId}
              mapFilter={mapFilter}
              onTrailSelect={(trail) => setSelectedReportTrail(trail)}
            />
          </div>

          {reportOpen && quickReportTrail ? (
            <QuickReportModal
              trail={quickReportTrail}
              distanceMeters={quickReportTarget.distanceMeters}
              reportSource={quickReportTarget.source}
              onClose={() => setReportOpen(false)}
              onSuccess={() => window.location.reload()}
            />
          ) : null}
        </>
      ) : currentView === "favorites" ? (
        <FavoritesManager trails={trails} />
      ) : (
        <TrailList trails={trails} />
      )}
    </div>
  );
}