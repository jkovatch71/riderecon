"use client";

import { useCallback, useEffect, useState } from "react";
import { addFavorite, getFavorites, removeFavorite } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export function FavoriteButton({ trailId }: { trailId: string }) {
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

      const favoriteIds: string[] = await getFavorites(accessToken).catch(() => []);
      setIsFavorite(favoriteIds.includes(trailId));
    } finally {
      setLoading(false);
    }
  }, [trailId, user, accessToken, authLoading]);

  useEffect(() => {
    loadFavoriteState();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadFavoriteState();
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

  if (loading || !user) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      className="text-xl leading-none transition duration-150 hover:scale-110 active:scale-95"
      aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
      title={isFavorite ? "Remove favorite" : "Add favorite"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isFavorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        className={`h-6 w-6 ${
          isFavorite ? "text-red-500" : "text-zinc-700 hover:text-zinc-300"
        }`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.239-4.5-5-4.5-1.74 0-3.27.81-4 2.09-.73-1.28-2.26-2.09-4-2.09-2.761 0-5 2.015-5 4.5 0 6.75 9 11.25 9 11.25s9-4.5 9-11.25z"
        />
      </svg>
    </button>
  );
}