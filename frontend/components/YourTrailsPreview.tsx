"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getFavorites } from "@/lib/api";
import type { Trail } from "@/lib/types";

function resolvedCondition(trail: Trail) {
  return trail.summary?.display_condition || trail.current_condition || "Unknown";
}

function resolvedColor(trail: Trail): "green" | "yellow" | "red" {
  return trail.summary?.display_status_color || "yellow";
}

function getBucketFromResolved(
  color: "green" | "yellow" | "red"
): "good" | "caution" | "bad" {
  if (color === "green") return "good";
  if (color === "red") return "bad";
  return "caution";
}

function groupLabel(bucket: "good" | "caution" | "bad") {
  if (bucket === "good") return "Good to ride";
  if (bucket === "caution") return "Use caution";
  return "Needs more time";
}

function statusClass(color: "green" | "yellow" | "red") {
  if (color === "green") return "text-emerald-300";
  if (color === "yellow") return "text-amber-300";
  return "text-rose-300";
}

export function YourTrailsPreview({ trails }: { trails: Trail[] }) {
  const { user, session, authLoading } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const accessToken = session?.access_token;

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      if (authLoading) return;

      if (!user || !accessToken) {
        if (!cancelled) setFavoriteIds([]);
        return;
      }

      const ids = await getFavorites(accessToken).catch((): string[] => []);

      if (!cancelled) {
        setFavoriteIds(ids);
      }
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [user, accessToken, authLoading]);

  const relevantTrails = useMemo(() => {
    if (!favoriteIds.length) {
      return trails.slice(0, 3);
    }

    const favoriteSet = new Set(favoriteIds);
    const favorites = trails.filter((trail) => favoriteSet.has(trail.id));

    return favorites.slice(0, 5);
  }, [trails, favoriteIds]);

  const grouped = useMemo(() => {
    const groups = {
      good: [] as Trail[],
      caution: [] as Trail[],
      bad: [] as Trail[],
    };

    for (const trail of relevantTrails) {
      const bucket = getBucketFromResolved(resolvedColor(trail));
      groups[bucket].push(trail);
    }

    return groups;
  }, [relevantTrails]);

  const hasTrails =
    grouped.good.length > 0 ||
    grouped.caution.length > 0 ||
    grouped.bad.length > 0;

  if (!hasTrails) {
    return (
      <section className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Based on your trails
            </p>
            <h2 className="mt-1 font-brand text-section-title font-semibold uppercase text-zinc-100">
              No trail data yet
            </h2>
          </div>

          <Link
            href="/trails"
            className="text-helper font-semibold uppercase tracking-wide text-emerald-300"
          >
            View all
          </Link>
        </div>

        <p className="mt-4 text-body text-zinc-300">
          Add favorites and check back once trail conditions start coming in.
        </p>
      </section>
    );
  }

  const orderedGroups: Array<{
    key: "bad" | "caution" | "good";
    trails: Trail[];
  }> = [
    { key: "bad", trails: grouped.bad },
    { key: "caution", trails: grouped.caution },
    { key: "good", trails: grouped.good },
  ];

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="mt-1 font-brand text-section-title font-semibold uppercase text-zinc-100">
            Briefing breakdown
          </h2>
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Based on your trails
          </p>
        </div>

        <Link
          href="/favorites"
          className="text-helper font-semibold uppercase tracking-wide text-emerald-300"
        >
          View all
        </Link>
      </div>

      <div className="mt-4 space-y-4">
        {orderedGroups.map(({ key, trails: groupTrails }) => {
          if (!groupTrails.length) return null;

          return (
            <div key={key}>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-px flex-1 bg-zinc-800" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {groupLabel(key)}
                </p>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <div className="space-y-2">
                {groupTrails.map((trail, index) => {
                  const displayCondition = resolvedCondition(trail);
                  const displayColor = resolvedColor(trail);

                  return (
                    <div key={trail.id}>
                      <Link
                        href={`/trails/${trail.id}`}
                        className="block rounded-lg transition active:scale-[0.99] hover:bg-zinc-900/40"
                      >
                        <div className="flex items-start justify-between gap-4 px-1 py-1">
                          <div className="min-w-0 flex-1">
                            <p className="font-brand text-body font-semibold uppercase text-zinc-100">
                              {trail.name}
                            </p>

                            {trail.system_name ? (
                              <p className="text-helper uppercase tracking-wide text-zinc-500">
                                {trail.system_name}
                              </p>
                            ) : null}
                          </div>

                          <div className="shrink-0 text-right">
                            <p className={`text-body font-semibold ${statusClass(displayColor)}`}>
                              {displayCondition}
                            </p>
                          </div>
                        </div>
                      </Link>

                      {index < groupTrails.length - 1 && (
                        <div className="my-2 flex justify-center">
                          <div className="h-px w-16 bg-zinc-800" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}