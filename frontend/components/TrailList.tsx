"use client";

import { useEffect, useMemo, useState } from "react";
import { Trail } from "@/lib/types";
import { TrailCard } from "@/components/TrailCard";
import { getFavorites } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export function TrailList({ trails }: { trails: Trail[] }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setHasSession(!!session?.user);

      if (!session?.user) {
        setFavoriteIds([]);
        return;
      }

      try {
        const ids = await getFavorites();
        setFavoriteIds(ids);
      } catch {
        setFavoriteIds([]);
      }
    }

    load();
  }, []);

const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const sortedTrails = useMemo(() => {
    return [...trails].sort((a, b) => {
      const aFav = favoriteIds.includes(a.id);
      const bFav = favoriteIds.includes(b.id);

      // Favorites first
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      // Then by last updated (newest first)
      const aTime = a.summary?.last_updated_at || "";
      const bTime = b.summary?.last_updated_at || "";

      return bTime.localeCompare(aTime);
    });
  }, [trails, favoriteSet]);

  return (
  <div className="grid gap-4 md:grid-cols-2">
    {sortedTrails.map((trail) => (
      <TrailCard
        key={trail.id}
        trail={trail}
        fullHeight={true}
        showMapLink={true}
      />
    ))}
  </div>
);
}