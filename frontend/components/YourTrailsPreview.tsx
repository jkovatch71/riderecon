"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Trail } from "@/lib/types";
import { getFavorites } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { getConditionColor, timeAgo } from "@/lib/utils";

function conditionClasses(condition?: string | null) {
  const color = getConditionColor(condition ?? undefined);

  if (color === "green") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (color === "yellow") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  return "border-rose-500/30 bg-rose-500/10 text-rose-300";
}

export function YourTrailsPreview({ trails }: { trails: Trail[] }) {
  const { user, session, authLoading } = useAuth();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const accessToken = session?.access_token;

  useEffect(() => {
    async function loadFavorites() {
      if (!user || !accessToken) {
        setFavoriteIds([]);
        return;
      }

      const ids = await getFavorites(accessToken).catch(() => []);
      setFavoriteIds(ids);
    }

    if (authLoading) return;
    loadFavorites();
  }, [user, accessToken, authLoading]);

  const favoriteTrails = useMemo(() => {
    if (!favoriteIds.length) return [];

    const favoriteSet = new Set(favoriteIds);

    return trails
      .filter((trail) => favoriteSet.has(trail.id))
      .sort((a, b) => {
        const aTime = a.summary?.last_updated_at || "";
        const bTime = b.summary?.last_updated_at || "";
        return bTime.localeCompare(aTime);
      })
      .slice(0, 3);
  }, [trails, favoriteIds]);

  if (authLoading) {
    return null;
  }

  if (!user) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
            Your Trails
          </h2>
          <Link
            href="/auth/login?next=/"
            className="text-helper font-medium uppercase tracking-wide text-emerald-300 hover:text-emerald-200"
          >
            Sign in
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-body text-zinc-300">
            Sign in to pin your favorite trails here for quick access.
          </p>
        </div>
      </section>
    );
  }

  if (!favoriteTrails.length) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
            Your Trails
          </h2>
          <Link
            href="/trails"
            className="text-helper font-medium uppercase tracking-wide text-emerald-300 hover:text-emerald-200"
          >
            Browse all
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-body text-zinc-300">
            You have no favorite trails yet. Head to Trails and tap the heart to save a few.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
          Your Trails
        </h2>
        <Link
          href="/favorites"
          className="text-helper font-medium uppercase tracking-wide text-emerald-300 hover:text-emerald-200"
        >
          View all
        </Link>
      </div>

      <div className="grid gap-3">
        {favoriteTrails.map((trail) => {
          const condition =
            trail.summary?.display_condition || trail.current_condition;

          return (
            <Link
              key={trail.id}
              href={`/trails/${trail.id}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-emerald-600/40 hover:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-trail text-section-title font-semibold uppercase break-words text-zinc-100">
                    {trail.name}
                  </p>
                  <p className="text-helper mt-1 font-medium uppercase tracking-wide text-zinc-500">
                    {trail.system_name}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${conditionClasses(
                    condition
                  )}`}
                >
                  {condition}
                </span>
              </div>

              <div className="mt-3 border-t border-zinc-800" />

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-body text-zinc-300">
                  {trail.summary?.last_updated_at
                    ? `Updated ${timeAgo(trail.summary.last_updated_at)}`
                    : "No recent reports"}
                </p>

                <span className="text-helper uppercase tracking-wide text-zinc-500">
                  Open
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}