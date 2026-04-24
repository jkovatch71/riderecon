"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { addFavorite, getFavorites, removeFavorite } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export function FavoriteButton({
  trailId,
  activeTone = "yellow",
}: {
  trailId: string;
  activeTone?: "yellow" | "muted";
}) {
  const { user, session, authLoading } = useAuth();

  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  const accessToken = session?.access_token;

  const loadFavoriteState = useCallback(async () => {
    if (authLoading) return;

    setLoading(true);

    try {
      if (!user || !accessToken) {
        setIsFavorite(false);
        return;
      }

      const favoriteIds: string[] = await getFavorites(accessToken).catch(
        () => []
      );
      setIsFavorite(favoriteIds.includes(trailId));
    } finally {
      setLoading(false);
    }
  }, [trailId, user, accessToken, authLoading]);

  useEffect(() => {
    void loadFavoriteState();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadFavoriteState();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadFavoriteState]);

  async function toggleFavorite(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !accessToken) return;

    if (isFavorite) {
      await removeFavorite(trailId, accessToken);
      setIsFavorite(false);
    } else {
      await addFavorite(trailId, accessToken);
      setIsFavorite(true);
    }
  }

  if (loading || !user) return null;

  const activeClass =
    activeTone === "muted" ? "text-zinc-400" : "text-yellow-400";

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      className="leading-none transition duration-150 hover:scale-110 active:scale-95"
      aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
      title={isFavorite ? "Remove favorite" : "Add favorite"}
    >
      <Star
        className={`h-6 w-6 transition ${
          isFavorite
            ? `${activeClass} fill-current`
            : "text-zinc-700 hover:text-zinc-300"
        }`}
        strokeWidth={1.8}
      />
    </button>
  );
}