import type { Trail } from "@/lib/types";

type Weather = {
  temperature?: number | null;
  summary?: string | null;
};

type RecentRain = {
  window_hours: number;
  rain_inches: number;
  threshold_inches: number;
  exceeds_threshold: boolean;
};

type BriefingResult = {
  headline: string;
  detail: string;
  supporting?: string;
  status: "rideable" | "caution" | "not_rideable" | "neutral";
};

function isBadWeatherNow(summary?: string | null) {
  if (!summary) return false;

  const s = summary.toLowerCase();

  return (
    s.includes("rain") ||
    s.includes("storm") ||
    s.includes("thunder") ||
    s.includes("ice") ||
    s.includes("sleet") ||
    s.includes("freez")
  );
}

function condition(trail: Trail) {
  return (trail.summary?.current_condition || trail.current_condition || "").toLowerCase();
}

function getRecoveryMix(trails: Trail[]) {
  let fast = 0;
  let average = 0;
  let slow = 0;

  for (const trail of trails) {
    const recoveryClass = trail.recovery_profile?.recovery_class;

    if (recoveryClass === "fast") fast++;
    else if (recoveryClass === "slow") slow++;
    else average++;
  }

  const total = trails.length || 1;

  return {
    fast,
    average,
    slow,
    fastRatio: fast / total,
    slowRatio: slow / total,
  };
}

function getRideability(trails: Trail[], recentRain?: RecentRain | null) {
  let good = 0;
  let caution = 0;
  let bad = 0;

  for (const trail of trails) {
    const c = condition(trail);

    if (c.includes("hero") || c === "dry") good++;
    else if (c === "damp" || c === "other") caution++;
    else if (c === "muddy" || c === "flooded" || c === "closed") bad++;
  }

  const total = trails.length || 1;
  const goodRatio = good / total;
  const badRatio = bad / total;
  const recoveryMix = getRecoveryMix(trails);

  if (recentRain?.exceeds_threshold) {
    if (badRatio >= 0.5) return "not_rideable";

    if (goodRatio >= 0.6) {
      if (recoveryMix.slowRatio >= 0.5) return "caution";
      return "rideable";
    }

    if (recoveryMix.fastRatio >= 0.6 && goodRatio >= 0.34) {
      return "caution";
    }

    return "not_rideable";
  }

  if (bad >= 2 || (bad >= 1 && good === 0 && caution === 0)) {
    return "not_rideable";
  }

  if (good >= 2 || (good >= 1 && bad === 0)) {
    return "rideable";
  }

  return "caution";
}

function shouldMentionRainAmount(recentRain?: RecentRain | null) {
  if (!recentRain) return false;
  return recentRain.exceeds_threshold || recentRain.rain_inches >= 0.1;
}

function formatRainAmount(inches: number) {
  return inches.toFixed(2).replace(/\.00$/, "");
}

function buildWeatherDetail(weather?: Weather | null, recentRain?: RecentRain | null) {
  const parts: string[] = [];

  if (weather?.summary) {
    parts.push(weather.summary);
  }

  if (recentRain && shouldMentionRainAmount(recentRain)) {
    parts.push(
      `${formatRainAmount(recentRain.rain_inches)}" rain / ${recentRain.window_hours}h`
    );
  }

  return parts.join(" · ");
}

function getTrailPhrase(usingFavorites: boolean) {
  return usingFavorites ? "Your favorite trails" : "Nearby trails";
}

function ensurePunctuation(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function buildBriefing(
  trails: Trail[],
  weather?: Weather | null,
  recentRain?: RecentRain | null,
  usingFavorites: boolean = false
): BriefingResult {
  const trailPhrase = getTrailPhrase(usingFavorites);

  if (!trails.length) {
    return {
      headline: "No trail data yet",
      detail: "Check back after more rider reports come in.",
      supporting: "Be the first to help the next rider out.",
      status: "neutral",
    };
  }

  const relevant = trails.slice(0, 3);
  const rideability = getRideability(relevant, recentRain);
  const weatherDetail = buildWeatherDetail(weather, recentRain);
  const recoveryMix = getRecoveryMix(relevant);

  if (isBadWeatherNow(weather?.summary)) {
    return {
      headline: "Bad weather right now",
      detail: ensurePunctuation(
        weatherDetail || "Current weather looks rough for a ride"
      ),
      supporting: ensurePunctuation(
        "Good day to check bolts, sealant, drivetrain or clean your bike"
      ),
      status: "not_rideable",
    };
  }

  if (rideability === "rideable") {
    let detail = `${trailPhrase} look good to ride`;

    if (recentRain?.exceeds_threshold && recoveryMix.fastRatio >= 0.5) {
      detail = `${trailPhrase} look promising, especially the faster-drying ones`;
    }

    return {
      headline: "Good to go!",
      detail: ensurePunctuation(
        weatherDetail ? `${detail}. ${weatherDetail}` : detail
      ),
      supporting: "Get out there and shred.",
      status: "rideable",
    };
  }

  if (rideability === "not_rideable") {
    let detail = `${trailPhrase} may still be too wet to ride`;

    if (recentRain?.exceeds_threshold) {
      detail = `${trailPhrase} likely need more time after recent rain`;
    }

    if (recoveryMix.slowRatio >= 0.5) {
      detail = `${trailPhrase} usually take longer to dry and may still be too soft`;
    }

    return {
      headline: "Probably too wet today",
      detail: ensurePunctuation(
        weatherDetail ? `${detail}. ${weatherDetail}` : detail
      ),
      supporting: ensurePunctuation(
        "Giving trails more time now helps prevent ruts"
      ),
      status: "not_rideable",
    };
  }

  let detail = `${trailPhrase} look mixed right now`;

  if (recentRain?.exceeds_threshold && recoveryMix.fastRatio >= 0.5) {
    detail = `${trailPhrase} look mixed, but some faster-drying trails may be okay`;
  }

  return {
    headline: "Use caution today",
    detail: ensurePunctuation(
      weatherDetail ? `${detail}. ${weatherDetail}` : detail
    ),
    supporting: ensurePunctuation("Check conditions before you roll out"),
    status: "caution",
  };
}