import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Trail, TrailReport } from "@/lib/types";

/**
 * Resolve API base URL safely for both client and server
 */
function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (envUrl) {
    return envUrl;
  }

  // Client-side fallback (local dev only)
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const apiProtocol = protocol === "https:" ? "https:" : "http:";
    return `${apiProtocol}//${hostname}:8000`;
  }

  // Server-side MUST have env var set
  throw new Error(
    "NEXT_PUBLIC_API_URL is not set. Server-side requests require a deployed backend URL."
  );
}

/**
 * Generic request helper
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiUrl = getApiBaseUrl();

  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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
 * Auth headers helper
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
  const apiUrl = getApiBaseUrl();

  const res = await fetch(`${apiUrl}/reports`, {
    method: "POST",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to submit report");
  }

  return res.json();
}

/**
 * Favorites
 */
const FAVORITES_CACHE_KEY = "favorites-cache";
const FAVORITES_TTL_MS = 2 * 60 * 1000;

type FavoritesCache = {
  data: string[];
  fetchedAt: number;
};

export async function getFavorites(accessToken?: string): Promise<string[]> {
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(FAVORITES_CACHE_KEY);

    if (raw) {
      try {
        const cached: FavoritesCache = JSON.parse(raw);
        const isFresh = Date.now() - cached.fetchedAt < FAVORITES_TTL_MS;

        if (isFresh && Array.isArray(cached.data)) {
          return cached.data;
        }
      } catch {
        window.localStorage.removeItem(FAVORITES_CACHE_KEY);
      }
    }
  }

  const apiUrl = getApiBaseUrl();

  const res = await fetch(`${apiUrl}/favorites`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Favorites request failed: ${res.status}`);
  }

  const favorites: string[] = await res.json();

  if (typeof window !== "undefined") {
    const payload: FavoritesCache = {
      data: favorites,
      fetchedAt: Date.now(),
    };

    window.localStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(payload));
  }

  return favorites;
}

export async function addFavorite(trailId: string, accessToken?: string) {
  const apiUrl = getApiBaseUrl();

  const res = await fetch(`${apiUrl}/favorites/${trailId}`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });

  if (!res.ok) {
    throw new Error(`Add favorite failed: ${res.status}`);
  }

  const result = await res.json();

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(FAVORITES_CACHE_KEY);
  }

  return result;
}

export async function removeFavorite(trailId: string, accessToken?: string) {
  const apiUrl = getApiBaseUrl();

  const res = await fetch(`${apiUrl}/favorites/${trailId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });

  if (!res.ok) {
    throw new Error(`Remove favorite failed: ${res.status}`);
  }

  const result = await res.json();

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(FAVORITES_CACHE_KEY);
  }

  return result;
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
  const apiUrl = getApiBaseUrl();

  const res = await fetch(`${apiUrl}/weather/current`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Weather request failed: ${res.status}`);
  }

  return res.json();
}

let recentRainCache:
  | { data: RecentRain; fetchedAt: number }
  | null = null;

const RECENT_RAIN_TTL_MS = 5 * 60 * 1000;

export async function getRecentRain(): Promise<RecentRain> {
  const now = Date.now();

  if (
    recentRainCache &&
    now - recentRainCache.fetchedAt < RECENT_RAIN_TTL_MS
  ) {
    return recentRainCache.data;
  }

  const apiUrl = getApiBaseUrl();

  const res = await fetch(`${apiUrl}/weather/recent-rain`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Recent rain request failed: ${res.status}`);
  }

  const data = await res.json();

  recentRainCache = {
    data,
    fetchedAt: now,
  };

  return data;
}