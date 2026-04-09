"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navigation } from "lucide-react";
import { Trail } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";
import { getConditionColor, timeAgo } from "@/lib/utils";
import { FavoriteButton } from "@/components/FavoriteButton";

export function TrailCard({
  trail,
  fullHeight = true,
  showMapLink = false,
}: {
  trail: Trail;
  fullHeight?: boolean;
  showMapLink?: boolean;
}) {
  const router = useRouter();
  return (
    <Link
      href={`/trails/${trail.id}`}
      className={`card block p-4 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-600/50 hover:shadow-lg ${
        fullHeight ? "h-full" : ""
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-section-title font-semibold break-words">
              {trail.name}
            </h3>
            <p className="text-helper text-zinc-400">{trail.system_name}</p>
          </div>

          <div className="flex-shrink-0">
            <StatusPill
              color={getConditionColor(
                trail.summary?.display_condition || trail.current_condition
              )}
              label={trail.summary?.display_condition || trail.current_condition}
            />
          </div>
        </div>

        <div className="mt-2 border-t border-zinc-700" />

        <div className="mt-2 flex items-end justify-between gap-4">
          <div className="text-body min-w-0 flex-1 space-y-1.5 text-zinc-300">
            <p>Recent Reports: {trail.summary?.reported_by_count ?? 0}</p>

            <p>
              Last Updated:{" "}
              {trail.summary?.last_updated_at
                ? timeAgo(trail.summary.last_updated_at)
                : "No recent reports"}
            </p>

            <div className="min-h-[20px]">
              {trail.summary?.recent_hazards?.length ? (
                <p className="text-amber-300">
                  ⚠ {trail.summary.recent_hazards.join(", ")}
                </p>
              ) : (
                <p className="text-emerald-300">✓ No hazards reported</p>
              )}
            </div>

            <div className="min-h-[20px]">
              {trail.weather_warning ? (
                <p className="text-amber-300">
                  ⚠ Weather caution: {trail.weather_warning}
                </p>
              ) : (
                <p className="text-emerald-300">✓ No weather-related issues</p>
              )}
            </div>
          </div>

          <div className="shrink-0 pb-1">
            <div className="flex items-center gap-3">
              {showMapLink ? (
                <button
                  type="button"
                  aria-label={`Open ${trail.name} on map`}
                  title="Open on map"
                  className="text-zinc-500 transition duration-150 hover:scale-110 hover:text-zinc-300 active:scale-95"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/?view=map&selected=${trail.id}`);
                  }}
                >
                  <Navigation className="h-5 w-5" />
                </button>
              ) : null}

              <div onClick={(e) => e.stopPropagation()}>
                <FavoriteButton trailId={trail.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}