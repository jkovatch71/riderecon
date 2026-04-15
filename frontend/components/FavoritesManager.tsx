"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "lucide-react";
import type { Trail } from "@/lib/types";
import { getFavorites, removeFavorite } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export function FavoritesManager({ trails }: { trails: Trail[] }) {
  const router = useRouter();
  const { user, session, authLoading } = useAuth();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const accessToken = session?.access_token;

  const loadFavorites = useCallback(async () => {
    if (!user || !accessToken) {
      setFavoriteIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const ids: string[] = await getFavorites(accessToken).catch(() => []);
      setFavoriteIds(ids);
    } finally {
      setLoading(false);
    }
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

  const favoriteTrails = useMemo(() => {
    if (!favoriteIds.length) return [];

    return favoriteIds
      .map((id) => trails.find((trail) => trail.id === id))
      .filter((trail): trail is Trail => Boolean(trail));
  }, [trails, favoriteIds]);

  async function removeFromFavorites(trailId: string) {
    if (!user || !accessToken) return;

    setSavingId(trailId);

    try {
      await removeFavorite(trailId, accessToken);
      setFavoriteIds((prev) => prev.filter((id) => id !== trailId));
    } finally {
      setSavingId(null);
    }
  }

  function openOnMap(trailId: string) {
    router.push(`/trails?view=map&selected=${trailId}`);
  }

  if (authLoading || loading) {
    return (
      <section className="card p-4">
        <p className="text-sm text-zinc-400">Loading favorites...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="card p-4">
        <p className="text-sm text-zinc-400">
          Sign in to view your favorite trails.
        </p>
      </section>
    );
  }

  if (!favoriteTrails.length) {
    return (
      <section className="card p-4">
        <p className="text-sm text-zinc-400">
          You haven’t saved any favorite trails yet.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-4">
      <div className="divide-y divide-zinc-800">
        {favoriteTrails.map((trail) => {
          const isSaving = savingId === trail.id;

          return (
            <div
              key={trail.id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1 pr-2">
                <p className="font-trail text-section-title break-words font-semibold uppercase text-zinc-100">
                  {trail.name}
                </p>
                <p className="text-helper font-medium uppercase tracking-wide text-zinc-500">
                  {trail.system_name}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openOnMap(trail.id)}
                  className="text-zinc-400 transition active:scale-95"
                  aria-label={`Open ${trail.name} on map`}
                  title="Open on map"
                >
                  <Navigation className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => removeFromFavorites(trail.id)}
                  disabled={isSaving}
                  className="leading-none text-zinc-500 transition active:scale-95 disabled:opacity-50"
                  aria-label="Remove favorite"
                  title="Remove favorite"
                >
                  {isSaving ? (
                    <span className="text-xl text-zinc-400">…</span>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      className="h-6 w-6 text-zinc-500"
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
            </div>
          );
        })}
      </div>
    </section>
  );
}