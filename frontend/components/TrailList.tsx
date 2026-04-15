"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trail } from "@/lib/types";
import { TrailCard } from "@/components/TrailCard";
import { getFavorites } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

export function TrailList({ trails }: { trails: Trail[] }) {
  const { user, authLoading } = useAuth();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds([]);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;

    if (!accessToken) {
      setFavoriteIds([]);
      return;
    }

    const ids: string[] = await getFavorites(accessToken).catch(() => []);
    setFavoriteIds(ids);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    loadFavorites();
  }, [authLoading, loadFavorites]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadFavorites();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadFavorites]);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const sortedTrails = useMemo(() => {
    return [...trails].sort((a, b) => {
      const aFav = favoriteSet.has(a.id);
      const bFav = favoriteSet.has(b.id);

      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      const aTime = a.summary?.last_updated_at || "";
      const bTime = b.summary?.last_updated_at || "";

      return bTime.localeCompare(aTime);
    });
  }, [trails, favoriteSet]);

  return (
    <div className="grid gap-3 md:grid-cols-2">
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