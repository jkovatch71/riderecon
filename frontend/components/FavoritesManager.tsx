"use client";

import { useEffect, useMemo, useState } from "react";
import type { Trail } from "@/lib/types";
import { addFavorite, getFavorites, removeFavorite } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export function FavoritesManager({ trails }: { trails: Trail[] }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setHasSession(!!session?.user);

      if (!session?.user) {
        setFavoriteIds([]);
        setLoading(false);
        return;
      }

      try {
        const ids = await getFavorites();
        setFavoriteIds(ids);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const sortedTrails = useMemo(() => {
  return [...trails].sort((a, b) => {
    const aFav = favoriteSet.has(a.id);
    const bFav = favoriteSet.has(b.id);

    if (aFav === bFav) return 0;
    return aFav ? -1 : 1;
  });
}, [trails, favoriteSet]);

  async function toggleFavorite(trailId: string) {
    if (!hasSession) return;

    setSavingId(trailId);

    try {
      if (favoriteSet.has(trailId)) {
        await removeFavorite(trailId);
        setFavoriteIds((prev) => prev.filter((id) => id !== trailId));
      } else {
        await addFavorite(trailId);
        setFavoriteIds((prev) => [...prev, trailId]);
      }
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading favorites...</p>;
  }

  if (!hasSession) {
    return (
      <p className="text-sm text-zinc-400">
        Sign in to manage your favorite trails.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sortedTrails.map((trail) => {
        const isFavorite = favoriteSet.has(trail.id);
        const isSaving = savingId === trail.id;

        return (
          <div
            key={trail.id}
            className="flex items-center justify-between rounded-xl border border-zinc-700 px-4 py-3"
          >
            <div className="min-w-0 flex-1 pr-4">
              <p className="font-trail text-section-title font-semibold uppercase break-words text-zinc-100">{trail.name}</p>
              <p className="text-helper font-medium uppercase tracking-wide text-zinc-500">
              {trail.system_name}
            </p>
            </div>

            <button
              type="button"
              onClick={() => toggleFavorite(trail.id)}
              disabled={isSaving}
              className="leading-none transition duration-150 hover:scale-110 active:scale-95 disabled:opacity-50"
              aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
              title={isFavorite ? "Remove favorite" : "Add favorite"}
            >
              {isSaving ? (
                <span className="text-xl text-zinc-400">…</span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill={isFavorite ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className={`h-6 w-6 transition-colors duration-200 ${
                    isFavorite ? "text-red-500" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.239-4.5-5-4.5-1.74 0-3.27.81-4 2.09-.73-1.28-2.26-2.09-4-2.09-2.761 0-5 2.015-5 4.5 0 6.75 9 11.25 9 11.25s9-4.5 9-11.25z"
                  />
                </svg>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}