import { Trail, TrailReport } from "@/lib/types";

/**
 * Resolve API base URL safely for both client and server.
 */
function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const apiProtocol = protocol === "https:" ? "https:" : "http:";
    return `${apiProtocol}//${hostname}:8000`;
  }

  throw new Error(
    "NEXT_PUBLIC_API_URL is not set. Server-side requests require a deployed backend URL."
  );
}

/**
 * Build auth headers only when a token is available.
 */
function authHeaders(
  accessToken?: string,
  includeJsonContentType = false
): HeadersInit {
  const headers: Record<string, string> = {};

  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

/**
 * Generic JSON request helper.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiUrl = getApiBaseUrl();

  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Trails
 */
export async function getTrails(): Promise<Trail[]> {
  return request<Trail[]>("/trails");
}

export async function getTrail(id: string): Promise<Trail> {
  return request<Trail>(`/trails/${id}`);
}

export async function getTrailReports(id: string): Promise<TrailReport[]> {
  return request<TrailReport[]>(`/trails/${id}/reports`);
}

/**
 * Reports
 */
export async function createReport(
  payload: {
    trail_id: string;
    primary_condition: string;
    hazard_tags: string[];
    note?: string;
  },
  accessToken?: string
) {
  return request("/reports", {
    method: "POST",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(payload),
  });
}

/**
 * Favorites
 *
 * Temporary QA-safe version:
 * - no localStorage caching
 * - always fetch fresh data
 */
export async function getFavorites(accessToken?: string): Promise<string[]> {
  const apiUrl = getApiBaseUrl();

  const res = await fetch(`${apiUrl}/favorites`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Favorites request failed: ${res.status}`);
  }

  return res.json();
}

export async function addFavorite(trailId: string, accessToken?: string) {
  return request(`/favorites/${trailId}`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export async function removeFavorite(trailId: string, accessToken?: string) {
  return request(`/favorites/${trailId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
}

/**
 * Weather
 */
export type CurrentWeather = {
  temperature?: number | null;
  summary?: string | null;
  raw_summary?: string | null;
};

export type RecentRain = {
  window_hours: number;
  rain_inches: number;
  threshold_inches: number;
  exceeds_threshold: boolean;
};

export async function getCurrentWeather(): Promise<CurrentWeather> {
  return request<CurrentWeather>("/weather/current");
}

let recentRainCache:
  | {
      data: RecentRain;
      fetchedAt: number;
    }
  | null = null;

let recentRainPromise: Promise<RecentRain> | null = null;

const RECENT_RAIN_TTL_MS = 5 * 60 * 1000;

export async function getRecentRain(): Promise<RecentRain> {
  const now = Date.now();

  if (recentRainCache && now - recentRainCache.fetchedAt < RECENT_RAIN_TTL_MS) {
    return recentRainCache.data;
  }

  if (recentRainPromise) {
    return recentRainPromise;
  }

  recentRainPromise = request<RecentRain>("/weather/recent-rain")
    .then((data) => {
      recentRainCache = {
        data,
        fetchedAt: Date.now(),
      };

      return data;
    })
    .finally(() => {
      recentRainPromise = null;
    });

  return recentRainPromise;
}