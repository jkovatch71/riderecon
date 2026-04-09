"use client";

import { useEffect, useState } from "react";
import { addFavorite, getFavorites, removeFavorite } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export function FavoriteButton({ trailId }: { trailId: string }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      setHasSession(!!session?.user);

      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const favoriteIds = await getFavorites();
        setIsFavorite(favoriteIds.includes(trailId));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [trailId]);

  async function toggleFavorite(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (!hasSession) return;

    if (isFavorite) {
      await removeFavorite(trailId);
      setIsFavorite(false);
    } else {
      await addFavorite(trailId);
      setIsFavorite(true);
    }
  }

  if (loading || !hasSession) {
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
        isFavorite
          ? "text-red-500"
          : "text-zinc-700 hover:text-zinc-300"
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