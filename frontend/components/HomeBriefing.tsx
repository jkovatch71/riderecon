"use client";

import { useEffect, useMemo, useState } from "react";
import { Trail } from "@/lib/types";
import { buildBriefing } from "@/lib/briefing";
import { getCurrentWeather, getFavorites, getRecentRain } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { getMyProfile } from "@/lib/profiles";

type Profile = {
  username?: string | null;
  display_name?: string | null;
};

type Weather = {
  temperature?: number | null;
  summary?: string | null;
  raw_summary?: string | null;
};

type RecentRain = {
  window_hours: number;
  rain_inches: number;
  threshold_inches: number;
  exceeds_threshold: boolean;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getWeatherIcon(summary?: string | null) {
  if (!summary) return "🌤️";

  const s = summary.toLowerCase();

  if (s.includes("thunder") || s.includes("storm")) return "⛈️";
  if (s.includes("rain") || s.includes("drizzle")) return "🌧️";
  if (s.includes("cloud")) return "☁️";
  if (s.includes("clear") || s.includes("sun")) return "☀️";

  return "🌤️";
}

function getWeatherDisplay(weather?: Weather | null) {
  const icon = getWeatherIcon(weather?.summary);

  if (weather?.temperature !== null && weather?.temperature !== undefined) {
    return `${icon} ${Math.round(weather.temperature)}°`;
  }

  return icon;
}

export function HomeBriefing({ trails }: { trails: Trail[] }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [checkedSession, setCheckedSession] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [recentRain, setRecentRain] = useState<RecentRain | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      try {
        const weatherPromise = getCurrentWeather().catch(() => null);
        const rainPromise = getRecentRain().catch(() => null);

        if (!session?.user) {
          setFavoriteIds([]);
          setProfile(null);
          setWeather(await weatherPromise);
          setRecentRain(await rainPromise);
          setCheckedSession(true);
          return;
        }

        const [ids, nextProfile, nextWeather, nextRain] = await Promise.all([
          getFavorites().catch(() => []),
          getMyProfile().catch(() => null),
          weatherPromise,
          rainPromise,
        ]);

        setFavoriteIds(ids);
        setProfile(nextProfile);
        setWeather(nextWeather);
        setRecentRain(nextRain);
      } finally {
        setCheckedSession(true);
      }
    }

    load();
  }, []);

  const briefingTrails = useMemo(() => {
    if (!favoriteIds.length) {
      return trails;
    }

    const favoriteSet = new Set(favoriteIds);
    const favorites = trails.filter((trail) => favoriteSet.has(trail.id));

    return favorites.length ? favorites : trails;
  }, [trails, favoriteIds]);

  const usingFavorites = favoriteIds.length > 0 && briefingTrails.length > 0;

  const briefing = useMemo(() => {
    return buildBriefing(
      briefingTrails,
      weather ?? undefined,
      recentRain ?? undefined,
      usingFavorites
    );
  }, [briefingTrails, weather, recentRain, usingFavorites]);

  const displayName =
    profile?.display_name || profile?.username || "rider";

  const greeting = checkedSession && profile
    ? `${getGreeting()}, ${displayName}!`
    : `${getGreeting()}!`;

  return (
  <div className="mt-3 max-w-3xl">
    <h1 className="text-page-title font-bold text-zinc-100">
      {greeting}
    </h1>

    <div className="mt-3 border-t border-zinc-700" />

    {!checkedSession ? (
      <p className="mt-4 text-sm text-zinc-300">
        Loading your trail briefing...
      </p>
    ) : (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-helper font-medium uppercase tracking-wide text-zinc-500">
            Based on reports + weather
          </p>

          <p className="text-body whitespace-nowrap font-medium text-zinc-300">
            {getWeatherDisplay(weather)}
          </p>
        </div>

        <p className="text-section-title font-semibold text-zinc-100">
          {briefing.headline}
        </p>

        <p className="text-body text-zinc-300">
          {briefing.detail}
        </p>

        {briefing.supporting ? (
          <p className="text-body pt-1 font-medium text-zinc-200">
            {briefing.supporting}
          </p>
        ) : null}
      </div>
    )}
  </div>
);
}