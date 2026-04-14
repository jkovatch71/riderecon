"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type BriefingScript = {
  greeting: string;
  status: string;
  detail: string;
  supporting: string | null;
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

  const [script, setScript] = useState<BriefingScript | null>(null);

  const [headingDone, setHeadingDone] = useState(false);
  const [statusDone, setStatusDone] = useState(false);
  const [detailDone, setDetailDone] = useState(false);
  const [supportingDone, setSupportingDone] = useState(false);

  const accessToken = session?.access_token;
  const lastScriptKeyRef = useRef("");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

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

          if (!cancelled) {
            setFavoriteIds([]);
            setWeather(nextWeather);
            setRecentRain(nextRain);
          }
          return;
        }

        const [ids, nextWeather, nextRain] = await Promise.all([
          getFavorites(accessToken).catch((): string[] => []),
          weatherPromise,
          rainPromise,
        ]);

        if (!cancelled) {
          setFavoriteIds(ids);
          setWeather(nextWeather);
          setRecentRain(nextRain);
        }
      } finally {
        if (!cancelled) {
          setLoadingBriefing(false);
        }
      }
    }

    if (authLoading) return;
    load();

    return () => {
      cancelled = true;
    };
  }, [user?.id, accessToken, authLoading]);

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

  const briefingReady = hasMounted && !authLoading && !loadingBriefing;

  const nextScript = useMemo<BriefingScript | null>(() => {
    if (!briefingReady) return null;

    return {
      greeting: greetingLine,
      status: briefing.headline,
      detail: briefing.detail,
      supporting: supportingText,
    };
  }, [briefingReady, greetingLine, briefing.headline, briefing.detail, supportingText]);

  useEffect(() => {
    if (!nextScript) return;

    const nextKey = JSON.stringify(nextScript);
    if (lastScriptKeyRef.current === nextKey) return;

    lastScriptKeyRef.current = nextKey;
    setScript(nextScript);

    setHeadingDone(false);
    setStatusDone(false);
    setDetailDone(false);
    setSupportingDone(false);
  }, [nextScript]);

  const metaReady =
    !!script &&
    headingDone &&
    statusDone &&
    detailDone &&
    (!script.supporting || supportingDone);

  return (
    <div className="max-w-2xl">
      <div className="min-h-[240px]">
        {/* Heading above divider */}
        <div className="min-h-[62px]">
          {script ? (
            <h1 className="font-brand text-page-title font-semibold uppercase leading-[1.05] text-zinc-100">
              <TypingText
                text={script.greeting}
                speed={48}
                startDelay={400}
                showCursor={!headingDone}
                onComplete={() => setHeadingDone(true)}
              />
            </h1>
          ) : null}
        </div>

        {/* Divider visible immediately */}
        <div className="border-t border-zinc-700" />

        {/* Briefing body below divider */}
        <div className="mt-5 min-h-[150px] space-y-4">
          {script && headingDone ? (
            <p className="font-brand text-section-title font-semibold uppercase leading-tight text-zinc-100">
              <TypingText
                text={script.status}
                speed={48}
                startDelay={250}
                showCursor={!statusDone}
                onComplete={() => setStatusDone(true)}
              />
            </p>
          ) : null}

          {script && statusDone ? (
            <p className="text-body font-medium text-zinc-200">
              <TypingText
                text={script.detail}
                speed={48}
                startDelay={250}
                showCursor={!detailDone}
                onComplete={() => setDetailDone(true)}
              />
            </p>
          ) : null}

          {script && detailDone && script.supporting ? (
            <p className="text-body font-medium text-zinc-200">
              <TypingText
                text={script.supporting}
                speed={48}
                startDelay={300}
                showCursor={!supportingDone}
                onComplete={() => setSupportingDone(true)}
                enableSound={true}
              />

              {supportingDone && (
                <span className="ml-0.5 inline-block text-emerald-300 animate-pulse">▌</span>
              )}
            </p>
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
      </div>
    </div>
  );
}