"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { List, Map, Heart } from "lucide-react";
import type { Trail } from "@/lib/types";
import { TrailList } from "@/components/TrailList";
import { TrailMapPlaceholder } from "@/components/TrailMapPlaceholder";
import { FavoritesManager } from "@/components/FavoritesManager";

type Props = {
  trails: Trail[];
};

export function TrailsPageClient({ trails }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedTrailId = searchParams.get("selected");

  const currentView = useMemo(() => {
    if (pathname === "/favorites") return "favorites";
    const viewParam = searchParams.get("view");
    return viewParam === "map" ? "map" : "list";
  }, [pathname, searchParams]);

  const listHref = "/trails?view=list";
  const mapHref = selectedTrailId
    ? `/trails?view=map&selected=${encodeURIComponent(selectedTrailId)}`
    : "/trails?view=map";
  const favoritesHref = "/favorites";

  return (
    <div className="space-y-3">
      <div className="card p-1.5">
        <div className="relative grid grid-cols-3 gap-2">
          <div
            className={`pointer-events-none absolute top-0 bottom-0 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/40 transition-all duration-300 ease-out ${
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
            <span>Trail List</span>
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
            <span>Map View</span>
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
            <Heart className="h-4 w-4" />
            <span>Favorites</span>
          </Link>
        </div>
      </div>

      {currentView === "map" ? (
        <TrailMapPlaceholder trails={trails} selectedTrailId={selectedTrailId} />
      ) : currentView === "favorites" ? (
        <FavoritesManager trails={trails} />
      ) : (
        <TrailList trails={trails} />
      )}
    </div>
  );
}