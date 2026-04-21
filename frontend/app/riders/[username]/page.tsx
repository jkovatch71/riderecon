"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RiderProfile = {
  id: string;
  username: string;
  garage_bay_1: string | null;
  garage_bay_2: string | null;
  garage_bay_3: string | null;
};

type Trail = {
  id: string;
  name: string;
  system_name: string | null;
};

type FavoriteTrailRow = {
  trail_id: string;
};

export default function RiderProfilePage() {
  const params = useParams();
  const router = useRouter();

  const usernameParam = params?.username;
  const username =
    typeof usernameParam === "string" ? usernameParam.toLowerCase() : "";

  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [favorites, setFavorites] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!username) {
        setProfile(null);
        setFavorites([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, garage_bay_1, garage_bay_2, garage_bay_3")
          .eq("username", username)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileData) {
          setProfile(null);
          setFavorites([]);
          return;
        }

        setProfile(profileData);

        const { data: favoriteRows, error: favoritesError } = await supabase
          .from("favorite_trails")
          .select("trail_id")
          .eq("user_id", profileData.id);

        if (favoritesError) {
          console.error("Failed to load rider favorites:", favoritesError);
          setFavorites([]);
          return;
        }

        const trailIds =
          ((favoriteRows as FavoriteTrailRow[] | null) ?? [])
            .map((row) => row.trail_id)
            .filter(Boolean);

        if (!trailIds.length) {
          setFavorites([]);
          return;
        }

        const { data: trailRows, error: trailsError } = await supabase
          .from("trails")
          .select("id, name, system_name")
          .in("id", trailIds);

        if (trailsError) {
          console.error("Failed to load favorite trail details:", trailsError);
          setFavorites([]);
          return;
        }

        const trails = (trailRows as Trail[] | null) ?? [];

        const orderedTrails = trailIds
          .map((id) => trails.find((trail) => trail.id === id))
          .filter((trail): trail is Trail => Boolean(trail));

        setFavorites(orderedTrails);
      } catch (err) {
        console.error("Failed to load rider profile:", err);
        setProfile(null);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [username]);

  if (loading) {
    return (
      <main className="space-y-6">
        <div className="card p-6">
          <p className="text-sm text-zinc-400">Loading rider profile...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="space-y-6">
        <div className="card p-6">
          <p className="text-sm text-zinc-400">Rider not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="card relative overflow-hidden p-6">
        <div className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-emerald-400/80" />

        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Rider
        </p>

        <div className="mt-2 border-t border-zinc-800 pt-3">
          <p className="text-lg font-semibold text-zinc-100">
            {profile.username}
          </p>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Garage
          </p>

          <div className="mt-2 space-y-2 border-t border-zinc-800 pt-3">
            {profile.garage_bay_1 && (
              <p className="text-sm text-zinc-300">
                <span className="text-zinc-500">Bay 1</span> · {profile.garage_bay_1}
              </p>
            )}

            {profile.garage_bay_2 && (
              <p className="text-sm text-zinc-300">
                <span className="text-zinc-500">Bay 2</span> · {profile.garage_bay_2}
              </p>
            )}

            {profile.garage_bay_3 && (
              <p className="text-sm text-zinc-300">
                <span className="text-zinc-500">Bay 3</span> · {profile.garage_bay_3}
              </p>
            )}

            {!profile.garage_bay_1 &&
              !profile.garage_bay_2 &&
              !profile.garage_bay_3 && (
                <p className="text-sm text-zinc-500">No bikes added yet.</p>
              )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Favorites
        </p>

        <div className="mt-2 border-t border-zinc-800 pt-3">
          {favorites.length === 0 ? (
            <p className="text-sm text-zinc-500">No favorite trails yet.</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {favorites.map((trail) => (
                <div
                  key={trail.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {trail.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {trail.system_name || ""}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      router.push(`/trails?view=map&selected=${trail.id}`)
                    }
                    className="text-zinc-400 transition hover:text-zinc-200"
                    aria-label={`View ${trail.name} on map`}
                    title="View on map"
                  >
                    📍
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}