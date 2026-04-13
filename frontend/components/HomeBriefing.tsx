"use client";

import { useEffect, useMemo, useState } from "react";
import { Trail } from "@/lib/types";
import { buildBriefing } from "@/lib/briefing";
import { getCurrentWeather, getFavorites, getRecentRain } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

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
  const { user, profile, authLoading } = useAuth();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [recentRain, setRecentRain] = useState<RecentRain | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    async function load() {
      setLoadingBriefing(true);

      try {
        const weatherPromise = getCurrentWeather().catch(() => null);
        const rainPromise = getRecentRain().catch(() => null);

        if (!user) {
          const [nextWeather, nextRain] = await Promise.all([
            weatherPromise,
            rainPromise,
          ]);

          setFavoriteIds([]);
          setWeather(nextWeather);
          setRecentRain(nextRain);
          return;
        }

        const [ids, nextWeather, nextRain] = await Promise.all([
          getFavorites().catch((): string[] => []),
          weatherPromise,
          rainPromise,
        ]);

        setFavoriteIds(ids);
        setWeather(nextWeather);
        setRecentRain(nextRain);
      } finally {
        setLoadingBriefing(false);
      }
    }

    if (authLoading) return;
    load();
  }, [user?.id, authLoading]);

  const briefingTrails = useMemo(() => {
    if (!favoriteIds.length) return trails;

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

  const displayName = profile?.display_name || profile?.username || null;
  const greetingBase = hasMounted ? `${getGreeting()},` : "Trail briefing";
  const greetingName = hasMounted && displayName ? `${displayName}!` : null;

  const supportingText =
    briefing.supporting &&
    briefing.supporting.trim() !== briefing.detail.trim()
      ? briefing.supporting
      : null;

  const isLoading = authLoading || loadingBriefing;

  return (
    <div className="mt-2 max-w-2xl">
      <h1 className="font-brand text-page-title font-semibold uppercase leading-[1.05] text-zinc-100">
        <span className="whitespace-nowrap">{greetingBase}</span>{" "}
        {greetingName ? <span>{greetingName}</span> : null}
      </h1>

      <div className="mt-3 border-t border-zinc-700" />

      {isLoading ? (
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

          <p className="font-brand text-section-title font-semibold uppercase leading-tight text-zinc-100">
            {briefing.headline}
          </p>

          <p className="text-body text-zinc-300">{briefing.detail}</p>

          {supportingText ? (
            <p className="text-body pt-1 font-medium text-zinc-200">
              {supportingText}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}