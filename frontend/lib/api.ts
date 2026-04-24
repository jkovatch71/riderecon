import type { Trail, TrailReport } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : undefined);

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

export type CurrentWeather = {
  temperature: number | null;
  summary: string | null;
  raw_summary?: string | null;
  is_raining_now?: boolean;
};

export type RecentRain = {
  rain_last_hour_inches: number | null;
  rain_last_3_hours_inches: number | null;
  rain_last_6_hours_inches: number | null;
  rain_last_12_hours_inches: number | null;
  rain_last_24_hours_inches: number | null;
  storm_rain_total_inches: number | null;
  drying_window_established: boolean | null;
  effective_drying_hours: number | null;
  unavailable?: boolean;
};

export type CreateReportPayload = {
  trail_id: string;
  primary_condition: string;
  hazard_tags: string[];
  note?: string;
  hazard_latitude?: number | null;
  hazard_longitude?: number | null;
  hazard_location_accuracy_meters?: number | null;
};

export type CreateReportResponse = {
  message: string;
  report: unknown;
};

async function fetchJson<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function resolveLoginIdentifier(
  identifier: string
): Promise<string> {
  const data = await fetchJson<{ email: string }>("/profiles/resolve-login", {
    method: "POST",
    body: JSON.stringify({ identifier }),
  });

  return data.email;
}

export async function getTrails(): Promise<Trail[]> {
  return fetchJson<Trail[]>("/trails");
}

export async function getTrail(trailId: string): Promise<Trail> {
  return fetchJson<Trail>(`/trails/${trailId}`);
}

export async function getTrailReports(trailId: string): Promise<TrailReport[]> {
  return fetchJson<TrailReport[]>(`/trails/${trailId}/reports`);
}

export async function createReport(
  payload: CreateReportPayload,
  accessToken: string
): Promise<CreateReportResponse> {
  return fetchJson<CreateReportResponse>("/reports", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function getFavorites(accessToken: string): Promise<string[]> {
  return fetchJson<string[]>("/favorites", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function addFavorite(
  trailId: string,
  accessToken: string
): Promise<void> {
  await fetchJson("/favorites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ trail_id: trailId }),
  });
}

export async function removeFavorite(
  trailId: string,
  accessToken: string
): Promise<void> {
  await fetchJson(`/favorites/${trailId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getCurrentWeather(): Promise<CurrentWeather> {
  return fetchJson<CurrentWeather>("/weather/current");
}

export async function getRecentRain(): Promise<RecentRain> {
  return fetchJson<RecentRain>("/weather/recent-rain");
}

export async function submitFeedback(payload: {
  name?: string;
  email?: string;
  message: string;
}) {
  return fetchJson("/feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}