"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { List, Map } from "lucide-react";
import type { Trail } from "@/lib/types";
import { TrailList } from "@/components/TrailList";
import { TrailMapPlaceholder } from "@/components/TrailMapPlaceholder";

type Props = {
  trails: Trail[];
};

export function TrailsPageClient({ trails }: Props) {
  const searchParams = useSearchParams();

  const viewParam = searchParams.get("view");
  const selectedTrailId = searchParams.get("selected");

  const view = viewParam === "map" ? "map" : "list";

  const listHref = useMemo(() => "/trails?view=list", []);
  const mapHref = useMemo(
    () =>
      selectedTrailId
        ? `/trails?view=map&selected=${encodeURIComponent(selectedTrailId)}`
        : "/trails?view=map",
    [selectedTrailId]
  );

  return (
    <div className="space-y-3">
      <div className="card p-1.5">
        <div className="relative grid grid-cols-2 gap-2">
            <div
            className={`pointer-events-none absolute top-0 bottom-0 w-[calc(50%-0.25rem)] rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/40 transition-all duration-300 ease-out ${
                view === "list" ? "left-0" : "left-[calc(50%+0.25rem)]"
            }`}
            />

            <Link
            href={listHref}
            className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                view === "list"
                ? "text-emerald-300"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            aria-current={view === "list" ? "page" : undefined}
            >
            <List className="h-4 w-4" />
            <span>Trail List</span>
            </Link>

            <Link
            href={mapHref}
            className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                view === "map"
                ? "text-emerald-300"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            aria-current={view === "map" ? "page" : undefined}
            >
            <Map className="h-4 w-4" />
            <span>Map View</span>
            </Link>
        </div>
        </div>

      {view === "map" ? (
        <TrailMapPlaceholder trails={trails} selectedTrailId={selectedTrailId} />
      ) : (
        <TrailList trails={trails} />
      )}
    </div>
  );
}