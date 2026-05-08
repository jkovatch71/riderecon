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

export type ConfirmReportResponse = {
  message: string;
  report_id: string;
  confirmation_count: number;
  confirmed_by_current_user: boolean;
};

export type RiderAssistType =
  | "tire"
  | "mechanical"
  | "crash"
  | "other";

export type RiderAssistDetail =
  | "need_air"
  | "tube_patch"
  | "plug_sealant"
  | "tire_off_bead"
  | "brakes"
  | "chain"
  | "shifting"
  | "wheel_rotor"
  | "cockpit"
  | "minor_first_aid"
  | "bike_check"
  | "rider_help"
  | "serious_injury"
  | "water"
  | "phone"
  | "lost_rider"
  | "animal"
  | "heat_issue"
  | "not_sure"
  | "other";

export type RiderAssistRequest = {
  id: string;
  user_id: string;
  username?: string | null;
  assist_type: RiderAssistType | string;
  assist_detail?: RiderAssistDetail | string | null;
  note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy_meters?: number | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
  responder_user_id?: string | null;
  responder_username?: string | null;
  responder_latitude?: number | null;
  responder_longitude?: number | null;
  responder_location_accuracy_meters?: number | null;
  responded_at?: string | null;
  resolved_at?: string | null;
};

export type CreateRiderAssistPayload = {
  assist_type: RiderAssistType;
  assist_detail?: RiderAssistDetail | null;
  note?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy_meters?: number | null;
};

async function fetchJson<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
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

export async function confirmReport(
  reportId: string,
  accessToken: string
): Promise<ConfirmReportResponse> {
  return fetchJson<ConfirmReportResponse>(`/reports/${reportId}/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function resolveLoginIdentifier(
  identifier: string
): Promise<string> {
  const data = await fetchJson<{ email: string }>("/auth/resolve-login", {
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

export async function createTrailSuggestion(
  payload: CreateTrailSuggestionPayload,
  accessToken: string
): Promise<TrailSuggestionResponse> {
  return fetchJson<TrailSuggestionResponse>("/trail-suggestions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function addFavorite(
  trailId: string,
  accessToken: string
): Promise<void> {
  await fetchJson(`/favorites/${trailId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
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

export async function getReportConfirmation(
  reportId: string,
  accessToken: string
): Promise<ConfirmReportResponse> {
  return fetchJson<ConfirmReportResponse>(
    `/reports/${reportId}/confirmation`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

export async function getRiderAssistRequests(): Promise<RiderAssistRequest[]> {
  return fetchJson<RiderAssistRequest[]>("/rider-assist");
}

export async function createRiderAssistRequest(
  payload: CreateRiderAssistPayload,
  accessToken: string
): Promise<{ message: string; request: RiderAssistRequest }> {
  return fetchJson<{ message: string; request: RiderAssistRequest }>(
    "/rider-assist",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }
  );
}

export async function respondToRiderAssistRequest(
  requestId: string,
  payload: {
    latitude?: number | null;
    longitude?: number | null;
    location_accuracy_meters?: number | null;
  },
  accessToken: string
): Promise<{ message: string; request: RiderAssistRequest }> {
  return fetchJson<{ message: string; request: RiderAssistRequest }>(
    `/rider-assist/${requestId}/respond`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }
  );
}

export type CreateTrailSuggestionPayload = {
  trail_name: string;
  system_name?: string;
  city?: string;
  state?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy_meters?: number | null;
  notes?: string;
};

export type TrailSuggestion = {
  id: string;
  user_id?: string | null;
  username?: string | null;
  trail_name: string;
  system_name?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy_meters?: number | null;
  notes?: string | null;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string;
  updated_at?: string | null;
};

export async function getAdminTrailSuggestions(
  accessToken: string
): Promise<TrailSuggestion[]> {
  return fetchJson<TrailSuggestion[]>("/admin/trail-suggestions", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function approveTrailSuggestion(
  suggestionId: string,
  accessToken: string
) {
  return fetchJson(`/admin/trail-suggestions/${suggestionId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function rejectTrailSuggestion(
  suggestionId: string,
  accessToken: string
) {
  return fetchJson(`/admin/trail-suggestions/${suggestionId}/reject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export type TrailSuggestionResponse = {
  message: string;
  suggestion: unknown;
};

export async function resolveRiderAssistRequest(
  requestId: string,
  accessToken: string
): Promise<{ message: string; request: RiderAssistRequest }> {
  return fetchJson<{ message: string; request: RiderAssistRequest }>(
    `/rider-assist/${requestId}/resolve`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}