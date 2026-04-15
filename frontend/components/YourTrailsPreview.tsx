"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getFavorites } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Trail } from "@/lib/types";

function normalizeCondition(trail: Trail) {
  return (
    trail.summary?.display_condition ||
    trail.summary?.current_condition ||
    trail.current_condition ||
    "Unknown"
  );
}

function getBucket(trail: Trail): "good" | "caution" | "bad" {
  const condition = normalizeCondition(trail).toLowerCase();
  const weatherWarning = (trail.weather_warning || "").toLowerCase();

  if (
    condition.includes("mud") ||
    condition.includes("flood") ||
    condition.includes("closed") ||
    weatherWarning.includes("wet") ||
    weatherWarning.includes("flood")
  ) {
    return "bad";
  }

  if (
    condition.includes("damp") ||
    condition.includes("caution") ||
    condition.includes("other") ||
    weatherWarning
  ) {
    return "caution";
  }

  return "good";
}

function statusText(trail: Trail) {
  return trail.weather_warning || normalizeCondition(trail);
}

function statusClass(bucket: "good" | "caution" | "bad") {
  if (bucket === "good") return "text-emerald-300";
  if (bucket === "caution") return "text-amber-300";
  return "text-rose-300";
}

function groupLabel(bucket: "good" | "caution" | "bad") {
  if (bucket === "good") return "Good to ride";
  if (bucket === "caution") return "Use caution";
  return "Needs more time";
}

export function YourTrailsPreview({ trails }: { trails: Trail[] }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      if (!user) {
        if (!cancelled) setFavoriteIds([]);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        if (!cancelled) setFavoriteIds([]);
        return;
      }

      const ids = await getFavorites(accessToken).catch((): string[] => []);

      if (!cancelled) {
        setFavoriteIds(ids);
      }
    }

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [user]);

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
      groups[getBucket(trail)].push(trail);
    }

    return groups;
  }, [relevantTrails]);

  const hasTrails =
    grouped.good.length > 0 || grouped.caution.length > 0 || grouped.bad.length > 0;

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
                {groupTrails.map((trail) => (
                  <div
                    key={trail.id}
                    className="flex items-start justify-between gap-4 rounded-lg px-1 py-1"
                  >
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
                      <p className={`text-body font-semibold ${statusClass(key)}`}>
                        {statusText(trail)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}