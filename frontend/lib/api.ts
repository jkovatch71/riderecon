import { Trail, TrailReport } from "@/lib/types";
import { supabase } from "@/lib/supabase";

function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (envUrl) {
    return envUrl;
  }

  if (typeof window === "undefined") {
    return "http://localhost:8000";
  }

  const { protocol, hostname } = window.location;
  const apiProtocol = protocol === "https:" ? "https:" : "http:";

  return `${apiProtocol}//${hostname}:8000`;
}

const API_URL = getApiBaseUrl();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status}`);
  }

  return res.json();
}

export async function getTrails(): Promise<Trail[]> {
  return request<Trail[]>("/trails");
}

export async function getTrail(id: string): Promise<Trail> {
  return request<Trail>(`/trails/${id}`);
}

export async function getTrailReports(id: string): Promise<TrailReport[]> {
  return request<TrailReport[]>(`/trails/${id}/reports`);
}

export async function createReport(payload: {
  trail_id: string;
  primary_condition: string;
  hazard_tags: string[];
  note?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${API_URL}/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: session ? `Bearer ${session.access_token}` : ""
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error("Failed to submit report");
  }

  return res.json();
}
async function authHeaders() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return {
    "Content-Type": "application/json",
    Authorization: session ? `Bearer ${session.access_token}` : ""
  };
}

export async function getFavorites(): Promise<string[]> {
  const res = await fetch(`${API_URL}/favorites`, {
    headers: await authHeaders(),
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Favorites request failed: ${res.status}`);
  }

  return res.json();
}

export async function addFavorite(trailId: string) {
  const res = await fetch(`${API_URL}/favorites/${trailId}`, {
    method: "POST",
    headers: await authHeaders()
  });

  if (!res.ok) {
    throw new Error(`Add favorite failed: ${res.status}`);
  }

  return res.json();
}

export async function removeFavorite(trailId: string) {
  const res = await fetch(`${API_URL}/favorites/${trailId}`, {
    method: "DELETE",
    headers: await authHeaders()
  });

  if (!res.ok) {
    throw new Error(`Remove favorite failed: ${res.status}`);
  }

  return res.json();
}

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
  const res = await fetch(`${API_URL}/weather/current`, {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Weather request failed: ${res.status}`);
  }

  return res.json();
}

export async function getRecentRain(): Promise<RecentRain> {
  const res = await fetch(`${API_URL}/weather/recent-rain`, {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Recent rain request failed: ${res.status}`);
  }

  return res.json();
}
