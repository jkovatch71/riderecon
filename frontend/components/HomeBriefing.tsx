"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildBriefing } from "@/lib/briefing";
import {
  getCurrentWeather,
  getFavorites,
  getRecentRain,
  type CurrentWeather,
  type RecentRain,
} from "@/lib/api";
import type { Trail } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { TypingText } from "@/components/TypingText";

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

function getWeatherDisplay(weather?: CurrentWeather | null) {
  const icon = getWeatherIcon(weather?.summary);

  if (weather?.temperature !== null && weather?.temperature !== undefined) {
    return `${icon} ${Math.round(weather.temperature)}°`;
  }

  return icon;
}

export function HomeBriefing({ trails }: { trails: Trail[] }) {
  const { user, profile, session, authLoading } = useAuth();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [recentRain, setRecentRain] = useState<RecentRain | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const [script, setScript] = useState<BriefingScript | null>(null);
  const [bootComplete, setBootComplete] = useState(false);

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

    async function loadWeather() {
      setLoadingWeather(true);

      try {
        const [nextWeather, nextRain] = await Promise.all([
          getCurrentWeather(),
          getRecentRain(),
        ]);

        if (!cancelled) {
          setWeather(nextWeather);
          setRecentRain(nextRain);
        }
      } finally {
        if (!cancelled) {
          setLoadingWeather(false);
        }
      }
    }

    loadWeather();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      if (authLoading) return;

      setLoadingFavorites(true);

      try {
        if (!user || !accessToken) {
          if (!cancelled) {
            setFavoriteIds([]);
          }
          return;
        }

        const ids = await getFavorites(accessToken).catch((): string[] => []);

        if (!cancelled) {
          setFavoriteIds(ids);
        }
      } finally {
        if (!cancelled) {
          setLoadingFavorites(false);
        }
      }
    }

    loadFavorites();

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

  const username = profile?.username || null;

  const greetingLine =
    hasMounted && username
      ? `${getGreeting()}, ${username.toUpperCase()}!`
      : `${getGreeting()}!`;

  const supportingText =
    briefing.supporting &&
    briefing.supporting.trim() !== briefing.detail.trim()
      ? briefing.supporting
      : null;

  const briefingReady =
    hasMounted && !authLoading && !loadingWeather && !loadingFavorites;

  const nextScript = useMemo<BriefingScript | null>(() => {
    if (!briefingReady) return null;

    return {
      greeting: greetingLine,
      status: briefing.headline,
      detail: briefing.detail,
      supporting: supportingText,
    };
  }, [
    briefingReady,
    greetingLine,
    briefing.headline,
    briefing.detail,
    supportingText,
  ]);

  useEffect(() => {
    if (!nextScript) return;

    const nextKey = JSON.stringify(nextScript);
    if (lastScriptKeyRef.current === nextKey) return;

    lastScriptKeyRef.current = nextKey;
    setScript(nextScript);

    setBootComplete(false);
    setHeadingDone(false);
    setStatusDone(false);
    setDetailDone(false);
    setSupportingDone(false);
  }, [nextScript]);

  useEffect(() => {
  if (!script) return;

  const timer = window.setTimeout(() => {
    setBootComplete(true);
  }, 1400);

  return () => window.clearTimeout(timer);
}, [script]);

  const metaReady =
    !!script &&
    headingDone &&
    statusDone &&
    detailDone &&
    (!script.supporting || supportingDone);

  return (
    <div className="max-w-2xl">
      <div className="min-h-[240px]">
        <div className="min-h-[62px]">
          {script ? (
            <h1 className="font-brand text-page-title font-semibold uppercase leading-[1.05] text-zinc-100">
              {!bootComplete ? (
                <span className="inline-flex items-center gap-1">
                  <span className="text-zinc-400">Initializing</span>
                  <span className="flex gap-[2px]">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-300" />
                    <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-300 [animation-delay:120ms]" />
                    <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-300 [animation-delay:240ms]" />
                  </span>
                </span>
              ) : (
                <TypingText
                  text={script.greeting}
                  speed={48}
                  startDelay={150}
                  showCursor={!headingDone}
                  onComplete={() => setHeadingDone(true)}
                />
              )}
            </h1>
          ) : null}
        </div>

        <div className="border-t border-zinc-700" />

        <div className="mt-5 min-h-[150px] space-y-4">
          {script && bootComplete && headingDone ? (
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

          {script && bootComplete && statusDone ? (
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

          {script && bootComplete && detailDone && script.supporting ? (
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
                <span className="ml-0.5 inline-block animate-pulse text-emerald-300">
                  ▌
                </span>
              )}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex items-end justify-between gap-3">
          <p
            className={`text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition-all duration-500 ease-out ${
              metaReady ? "translate-y-0 opacity-100" : "translate-y-.5 opacity-0"
            }`}
          >
            BASED ON WEATHER &amp; RIDER REPORTS
          </p>

          <p
            className={`text-body whitespace-nowrap font-medium text-zinc-300 transition-all duration-500 ease-out ${
              metaReady ? "translate-y-0 opacity-100" : "translate-y-.5 opacity-0"
            }`}
          >
            {getWeatherDisplay(weather)}
          </p>
        </div>
      </div>
    </div>
  );
}