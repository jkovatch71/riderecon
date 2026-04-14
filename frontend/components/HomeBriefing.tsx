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
  const [headlineDone, setHeadlineDone] = useState(false);
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
    setHeadlineDone(false);
    setSupportingDone(false);
  }, [
    user?.id,
    profile?.display_name,
    profile?.username,
    trails,
    weather?.summary,
    weather?.temperature,
    recentRain?.rain_inches,
    recentRain?.exceeds_threshold,
  ]);

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
    briefing.supporting.trim() !== briefing.headline.trim()
      ? briefing.supporting
      : null;

  const isLoading = authLoading || loadingBriefing;
  const metaReady = headingDone && headlineDone && (!supportingText || supportingDone);

  return (
    <div className="max-w-2xl">
      <div className="min-h-[220px]">
        <div className="border-t border-zinc-700" />

        {isLoading ? (
          <div className="mt-5 min-h-[140px]" />
        ) : (
          <>
            <div className="mt-5 min-h-[140px] space-y-4">
              <h1 className="font-brand text-page-title font-semibold uppercase leading-[1.05] text-zinc-100">
                <TypingText
                  text={greetingLine}
                  speed={30}
                  startDelay={400}
                  showCursor={!headingDone}
                  onComplete={() => setHeadingDone(true)}
                />
              </h1>

              <p className="font-brand text-section-title font-semibold uppercase leading-tight text-zinc-100">
                {headingDone ? (
                  <TypingText
                    text={briefing.headline}
                    speed={30}
                    startDelay={700}
                    showCursor={!headlineDone}
                    onComplete={() => setHeadlineDone(true)}
                  />
                ) : null}
              </p>

              <p className="text-body font-medium text-zinc-200">
                {headlineDone && supportingText ? (
                  <TypingText
                    text={supportingText}
                    speed={30}
                    startDelay={1000}
                    showCursor={!supportingDone}
                    onComplete={() => setSupportingDone(true)}
                  />
                ) : headlineDone && !supportingText ? (
                  <span className="inline-block animate-pulse">_</span>
                ) : null}
              </p>

              {metaReady ? (
                <div className="pt-1">
                  <span className="inline-block animate-pulse text-zinc-200">_</span>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex items-end justify-between gap-3">
              <p
                className={`text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition-all duration-500 ease-out ${
                  metaReady ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                }`}
              >
                BASED ON WEATHER &amp; RIDER REPORTS
              </p>

              <p
                className={`text-body whitespace-nowrap font-medium text-zinc-300 transition-all duration-500 ease-out ${
                  metaReady ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                }`}
              >
                {getWeatherDisplay(weather)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}