import type { Trail } from "@/lib/types";
import type { CurrentWeather as Weather, RecentRain } from "@/lib/api";

type BriefingOptions = {
  tone?: "rider" | "neutral";
  detailLevel?: "quick" | "standard" | "detailed";
  sensitivity?: "conservative" | "balanced" | "aggressive";
};

type BriefingResult = {
  headline: string;
  detail: string;
  supporting?: string;
  status: "rideable" | "caution" | "not_rideable" | "neutral";
};

function getDisplayCondition(trail: Trail) {
  return trail.summary?.display_condition || trail.current_condition || "Unknown";
}

function getTrailPhrase(usingFavorites: boolean) {
  return usingFavorites ? "Your favorite trails" : "Nearby trails";
}

function ensurePunctuation(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function applyDetailLevel(
  text: string,
  level: "quick" | "standard" | "detailed"
) {
  const base = ensurePunctuation(text);

  if (level === "quick") {
    const firstSentence = base.match(/^.*?[.!?](?:\s|$)/);
    return firstSentence ? firstSentence[0].trim() : base;
  }

  if (level === "detailed") {
    return `${base} Conditions may still vary a bit by trail and terrain.`;
  }

  return base;
}

function buildWeatherDetail(weather?: Weather | null) {
  if (!weather?.summary) return "";
  return weather.summary;
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
    averageRatio: average / total,
    slowRatio: slow / total,
  };
}

function getConditionMix(trails: Trail[]) {
  let wet = 0;
  let notReady = 0;
  let dry = 0;
  let unknown = 0;

  for (const trail of trails) {
    const c = getDisplayCondition(trail).toLowerCase();

    if (
      c.includes("wet / unrideable") ||
      c.includes("wet") ||
      c.includes("muddy") ||
      c.includes("flooded") ||
      c.includes("closed")
    ) {
      wet++;
    } else if (
      c.includes("needs more time") ||
      c.includes("damp") ||
      c.includes("likely wet")
    ) {
      notReady++;
    } else if (c.includes("dry") || c.includes("hero")) {
      dry++;
    } else {
      unknown++;
    }
  }

  const total = trails.length || 1;

  return {
    wet,
    notReady,
    dry,
    unknown,
    wetRatio: wet / total,
    notReadyRatio: notReady / total,
    dryRatio: dry / total,
    unknownRatio: unknown / total,
  };
}

function getStormBand(stormTotal: number) {
  const value = stormTotal ?? 0;
  if (value < 0.1) return "light";
  if (value < 0.5) return "moderate";
  if (value < 1.5) return "heavy";
  return "extreme";
}

function getSlowTrailPhrase(usingFavorites: boolean) {
  return usingFavorites
    ? "Your favorites usually hold moisture longer"
    : "A lot of these trails usually hold moisture longer";
}

function getFastTrailPhrase(usingFavorites: boolean) {
  return usingFavorites
    ? "Your favorites tend to dry quicker than most"
    : "Some of these trails tend to dry quicker than most";
}

function riderOrNeutral(
  tone: "rider" | "neutral",
  riderText: string,
  neutralText: string
) {
  return tone === "neutral" ? neutralText : riderText;
}

export function buildBriefing(
  trails: Trail[],
  weather?: Weather | null,
  recentRain?: RecentRain | null,
  usingFavorites = false,
  options?: BriefingOptions
): BriefingResult {
  const tone = options?.tone ?? "rider";
  const detailLevel = options?.detailLevel ?? "standard";
  const sensitivity = options?.sensitivity ?? "balanced";

  const trailPhrase = getTrailPhrase(usingFavorites);

  if (!trails.length) {
    return {
      headline: "No trail data yet",
      detail: "Check back after more rider reports come in.",
      supporting: "Be the first to help the next rider out.",
      status: "neutral",
    };
  }

  const relevant = trails.slice(0, 5);
  const weatherDetail = buildWeatherDetail(weather);
  const recoveryMix = getRecoveryMix(relevant);
  const conditionMix = getConditionMix(relevant);

  const isActiveRain = !!weather?.is_raining_now;
  const stormTotal = recentRain?.storm_rain_total_inches ?? 0;
  const dryingStarted = recentRain?.drying_window_established ?? false;
  const effectiveDryingHours = recentRain?.effective_drying_hours ?? 0;
  const rainUnavailable = !!recentRain?.unavailable;
  const stormBand = getStormBand(stormTotal);

  const stormThreshold =
    sensitivity === "conservative"
      ? 0.3
      : sensitivity === "aggressive"
        ? 0.8
        : 0.5;

  const wetThreshold =
    sensitivity === "conservative"
      ? 0.5
      : sensitivity === "aggressive"
        ? 0.7
        : 0.6;

  /*
   * PRIORITY 1: ACTIVE RAIN
   */
  if (isActiveRain) {
    if (stormBand === "extreme" || stormBand === "heavy") {
      return {
        headline: riderOrNeutral(
          tone,
          "Hang it up for now",
          "Not rideable right now"
        ),
        detail: applyDetailLevel(
          weatherDetail
            ? `${weatherDetail}. ${trailPhrase} are soaked and not rideable right now`
            : `${trailPhrase} are soaked and not rideable right now`,
          detailLevel
        ),
        supporting: riderOrNeutral(
          tone,
          "This is rut-making weather. Let the dirt chill.",
          "Conditions are too wet right now and need time to recover."
        ),
        status: "not_rideable",
      };
    }

    return {
      headline: riderOrNeutral(
        tone,
        "Not worth it right now",
        "Not rideable right now"
      ),
      detail: applyDetailLevel(
        weatherDetail
          ? `${weatherDetail}. The dirt is too wet to be worth it`
          : `${trailPhrase} are too wet to ride right now`,
        detailLevel
      ),
      supporting: riderOrNeutral(
        tone,
        "Good time to wrench, lube the chain, or wait it out.",
        "Best to wait until conditions improve."
      ),
      status: "not_rideable",
    };
  }

  /*
   * PRIORITY 2: POST-STORM, NO REAL DRYING WINDOW YET
   */
  if (!rainUnavailable && !dryingStarted && stormTotal >= stormThreshold) {
    if (recoveryMix.slowRatio >= 0.5) {
      return {
        headline: riderOrNeutral(
          tone,
          "Still way too soft",
          "Still too wet to ride"
        ),
        detail: applyDetailLevel(
          `${trailPhrase} have not started recovering yet after the storm`,
          detailLevel
        ),
        supporting: riderOrNeutral(
          tone,
          `${getSlowTrailPhrase(usingFavorites)}. They need real dry time before they come back around.`,
          "These trails recover slowly and still need meaningful drying time."
        ),
        status: "not_rideable",
      };
    }

    return {
      headline: riderOrNeutral(
        tone,
        "Still too wet to ride",
        "Still too wet to ride"
      ),
      detail: applyDetailLevel(
        `${trailPhrase} haven't had time to dry yet`,
        detailLevel
      ),
      supporting: riderOrNeutral(
        tone,
        "The rain may have backed off, but the mud remains.",
        "Rain may have eased, but the trails have not started recovering yet."
      ),
      status: "not_rideable",
    };
  }

  /*
   * PRIORITY 3: DRYING HAS STARTED, BUT MOST TRAILS STILL NOT READY
   */
  if (conditionMix.wetRatio + conditionMix.notReadyRatio >= wetThreshold) {
    if (!rainUnavailable && dryingStarted) {
      if (recoveryMix.fastRatio >= 0.5 && effectiveDryingHours >= 8) {
        return {
          headline: riderOrNeutral(
            tone,
            "Starting to turn around",
            "Conditions are improving"
          ),
          detail: applyDetailLevel(
            `${trailPhrase} are still mostly not ready, but the faster-drying ones may be heading the right way`,
            detailLevel
          ),
          supporting: riderOrNeutral(
            tone,
            "Not hero dirt yet—still more drying to go.",
            "Some improvement is underway, but more drying time is still needed."
          ),
          status: "caution",
        };
      }

      if (recoveryMix.slowRatio >= 0.5) {
        return {
          headline: riderOrNeutral(
            tone,
            "Needs more time",
            "Needs more time"
          ),
          detail: applyDetailLevel(
            `${trailPhrase} are still holding moisture and not ready yet`,
            detailLevel
          ),
          supporting: riderOrNeutral(
            tone,
            `${getSlowTrailPhrase(usingFavorites)}. Give them a longer runway.`,
            "These trails recover more slowly and still need additional time."
          ),
          status: "not_rideable",
        };
      }

      return {
        headline: riderOrNeutral(
          tone,
          "Needs more time",
          "Needs more time"
        ),
        detail: applyDetailLevel(
          `${trailPhrase} are drying out, but most are still not ready to ride`,
          detailLevel
        ),
        supporting: riderOrNeutral(
          tone,
          "Close, but not worth forcing it.",
          "Conditions are improving, but not enough yet."
        ),
        status: "caution",
      };
    }

    return {
      headline: riderOrNeutral(
        tone,
        "Still not ready",
        "Still not ready"
      ),
      detail: applyDetailLevel(
        `${trailPhrase} are still too wet in most spots`,
        detailLevel
      ),
      supporting: riderOrNeutral(
        tone,
        "A little patience now keeps the tread from getting wrecked.",
        "Waiting longer will help protect the trails."
      ),
      status: "not_rideable",
    };
  }

  /*
   * PRIORITY 4: MOSTLY DRY / GOOD TO GO
   */
  if (conditionMix.dryRatio >= 0.6) {
    if (recoveryMix.fastRatio >= 0.5) {
      return {
        headline: riderOrNeutral(
          tone,
          "Looks rideable",
          "Looks rideable"
        ),
        detail: applyDetailLevel(
          weatherDetail
            ? `${trailPhrase} are mostly looking good. ${weatherDetail}`
            : `${trailPhrase} are mostly looking good to roll`,
          detailLevel
        ),
        supporting: riderOrNeutral(
          tone,
          `${getFastTrailPhrase(usingFavorites)}. This is the kind of window to jump on.`,
          "These trails tend to dry faster than most and may be in a better window now."
        ),
        status: "rideable",
      };
    }

    return {
      headline: riderOrNeutral(
        tone,
        "Good to roll",
        "Good to ride"
      ),
      detail: applyDetailLevel(
        weatherDetail
          ? `${trailPhrase} are mostly dry and rideable. ${weatherDetail}`
          : `${trailPhrase} are mostly dry and rideable`,
        detailLevel
      ),
      supporting: riderOrNeutral(
        tone,
        "Could be a good day to grab a lap.",
        "Conditions look favorable for a ride."
      ),
      status: "rideable",
    };
  }

  /*
   * PRIORITY 5: TRUE MIXED CONDITIONS
   */
  if (
    conditionMix.dryRatio > 0 &&
    (conditionMix.wetRatio > 0 || conditionMix.notReadyRatio > 0)
  ) {
    if (recoveryMix.fastRatio >= 0.5) {
      return {
        headline: riderOrNeutral(
          tone,
          "Mixed, but improving",
          "Conditions are mixed"
        ),
        detail: applyDetailLevel(
          `${trailPhrase} are split right now—faster-drying trails may come around sooner than the rest`,
          detailLevel
        ),
        supporting: riderOrNeutral(
          tone,
          "Pick carefully before you load up and head out.",
          "Some trails are recovering faster than others."
        ),
        status: "caution",
      };
    }

    if (recoveryMix.slowRatio >= 0.5) {
      return {
        headline: riderOrNeutral(
          tone,
          "Mixed, lean cautious",
          "Conditions are mixed"
        ),
        detail: applyDetailLevel(
          `${trailPhrase} are mixed, but the slower-drying ones are still probably holding moisture`,
          detailLevel
        ),
        supporting: riderOrNeutral(
          tone,
          "This is one of those days where the safe play is usually the smart play.",
          "The slower-recovering trails likely still need more time."
        ),
        status: "caution",
      };
    }

    return {
      headline: riderOrNeutral(
        tone,
        "Conditions are mixed",
        "Conditions are mixed"
      ),
      detail: applyDetailLevel(
        `${trailPhrase} are split right now—some sections are getting there, others still need time`,
        detailLevel
      ),
      supporting: riderOrNeutral(
        tone,
        "Check the trail cards before you commit.",
        "Review individual trail status before heading out."
      ),
      status: "caution",
    };
  }

  /*
   * PRIORITY 6: FALLBACK / UNKNOWN
   */
  return {
    headline: riderOrNeutral(
      tone,
      "Still sorting itself out",
      "Conditions are still unclear"
    ),
    detail: applyDetailLevel(
      `${trailPhrase} don't look clearly rideable yet based on the latest mix of weather and reports`,
      detailLevel
    ),
    supporting: riderOrNeutral(
      tone,
      rainUnavailable
        ? "Weather data is thin right now, so lean conservative."
        : "A little more time or another fresh report will tell the story.",
      rainUnavailable
        ? "Weather data is limited right now, so it is safer to be cautious."
        : "More time or a fresh trail report should make the picture clearer."
    ),
    status: "caution",
  };
}