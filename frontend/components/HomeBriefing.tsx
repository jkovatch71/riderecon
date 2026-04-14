"use client";

import { useEffect, useMemo, useState } from "react";
import { Trail } from "@/lib/types";
import { buildBriefing } from "@/lib/briefing";
import { getCurrentWeather, getFavorites, getRecentRain } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { TypingText } from "@/components/TypingText";

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
  if (hour < 12) return "GOOD MORNING";
  if (hour < 18) return "GOOD AFTERNOON";
  return "GOOD EVENING";
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
  const { user, profile, session, authLoading } = useAuth();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [recentRain, setRecentRain] = useState<RecentRain | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const [headingDone, setHeadingDone] = useState(false);
  const [detailDone, setDetailDone] = useState(false);
  const [supportingDone, setSupportingDone] = useState(false);

  const accessToken = session?.access_token;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    async function load() {
      setLoadingBriefing(true);

      try {
        const weatherPromise = getCurrentWeather().catch(() => null);
        const rainPromise = getRecentRain().catch(() => null);

        if (!user || !accessToken) {
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
          getFavorites(accessToken).catch((): string[] => []),
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
  }, [user?.id, accessToken, authLoading]);

  useEffect(() => {
    setHeadingDone(false);
    setDetailDone(false);
    setSupportingDone(false);
  }, [user?.id, profile?.display_name, profile?.username, trails, weather, recentRain]);

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
  const greetingLine =
    hasMounted && displayName
      ? `${getGreeting()}, ${displayName.toUpperCase()}!`
      : `${getGreeting()}!`;

  const supportingText =
    briefing.supporting &&
    briefing.supporting.trim() !== briefing.detail.trim()
      ? briefing.supporting
      : null;

  const isLoading = authLoading || loadingBriefing;
  const metaReady = headingDone && detailDone && (!supportingText || supportingDone);

  if (isLoading) {
    return (
      <div className="mt-2 max-w-2xl">
        <div className="min-h-[220px]">
          <div className="mt-3 border-t border-zinc-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 max-w-2xl">
      <div className="min-h-[220px]">
        <div className="mt-3 border-t border-zinc-700" />

        <div className="mt-5 min-h-[132px] space-y-4">
          <h1 className="font-brand text-page-title font-semibold uppercase leading-[1.05] text-zinc-100">
            <TypingText
              text={greetingLine}
              speed={18}
              startDelay={250}
              showCursor={!headingDone}
              onComplete={() => setHeadingDone(true)}
            />
          </h1>

          <p className="font-brand text-section-title font-semibold uppercase leading-tight text-zinc-100">
            {headingDone ? (
              <TypingText
                text={briefing.headline}
                speed={18}
                startDelay={250}
                showCursor={!detailDone}
                onComplete={() => setDetailDone(true)}
              />
            ) : null}
          </p>

          <p className="text-body font-medium text-zinc-200">
            {detailDone && supportingText ? (
              <TypingText
                text={supportingText}
                speed={18}
                startDelay={250}
                showCursor
                onComplete={() => setSupportingDone(true)}
              />
            ) : detailDone && !supportingText ? (
              <span className="inline-block animate-pulse">_</span>
            ) : null}
          </p>
        </div>

        <div className="mt-6 flex items-end justify-between gap-3">
          <p
            className={`text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition-opacity duration-300 ${
              metaReady ? "opacity-100" : "opacity-0"
            }`}
          >
            Based on weather &amp; rider reports
          </p>

          <p
            className={`text-body whitespace-nowrap font-medium text-zinc-300 transition-opacity duration-300 ${
              metaReady ? "opacity-100" : "opacity-0"
            }`}
          >
            {getWeatherDisplay(weather)}
          </p>
        </div>
      </div>
    </div>
  );
}