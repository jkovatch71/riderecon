import { Trail, TrailReport } from "@/lib/types";

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

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

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
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      detail = "";
    }

    throw new ApiError(detail || `API request failed: ${res.status}`, res.status);
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
): Promise<{ message: string }> {
  return request<{ message: string }>("/reports", {
    method: "POST",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(payload),
  });
}

/**
 * Favorites
 */
export async function getFavorites(accessToken?: string): Promise<string[]> {
  if (!accessToken) {
    return [];
  }

  const apiUrl = getApiBaseUrl();

  const res = await fetch(`${apiUrl}/favorites`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ApiError(`Favorites request failed: ${res.status}`, res.status);
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
  cached_at?: string;
  unavailable?: boolean;
};

let currentWeatherPromise: Promise<CurrentWeather | null> | null = null;
let recentRainPromise: Promise<RecentRain | null> | null = null;

export async function getCurrentWeather(): Promise<CurrentWeather | null> {
  if (currentWeatherPromise) {
    return currentWeatherPromise;
  }

  currentWeatherPromise = request<CurrentWeather>("/weather/current")
    .catch((error: unknown) => {
      console.warn("getCurrentWeather failed:", error);
      return null;
    })
    .finally(() => {
      currentWeatherPromise = null;
    });

  return currentWeatherPromise;
}

export async function getRecentRain(): Promise<RecentRain | null> {
  if (recentRainPromise) {
    return recentRainPromise;
  }

  recentRainPromise = request<RecentRain>("/weather/recent-rain")
    .catch((error: unknown) => {
      console.warn("getRecentRain failed:", error);
      return null;
    })
    .finally(() => {
      recentRainPromise = null;
    });

  return recentRainPromise;
}