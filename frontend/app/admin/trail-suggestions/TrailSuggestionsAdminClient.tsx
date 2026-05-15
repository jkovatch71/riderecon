"use client";

import { useEffect, useMemo, useState } from "react";
import {
  approveTrailSuggestion,
  getAdminTrailSuggestions,
  rejectTrailSuggestion,
  type TrailSuggestion,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type CoordinateDraft = {
  latitude: string;
  longitude: string;
};

function formatStatus(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "needs_location") return "Needs Location";
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "duplicate") return "Duplicate";
  return "Pending";
}

function statusClassName(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "approved") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "rejected") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }

  if (normalized === "needs_location" || normalized === "duplicate") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  return "border-zinc-800 bg-zinc-950/60 text-zinc-500";
}

function hasSuggestionGps(suggestion: TrailSuggestion) {
  return (
    typeof suggestion.latitude === "number" &&
    Number.isFinite(suggestion.latitude) &&
    typeof suggestion.longitude === "number" &&
    Number.isFinite(suggestion.longitude)
  );
}

function parseCoordinate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}

function coordinatesAreValid(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return false;

  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function getDraftCoordinates(draft?: CoordinateDraft) {
  const latitude = parseCoordinate(draft?.latitude ?? "");
  const longitude = parseCoordinate(draft?.longitude ?? "");

  return {
    latitude,
    longitude,
    valid: coordinatesAreValid(latitude, longitude),
  };
}

function canApproveSuggestion(
  suggestion: TrailSuggestion,
  draft?: CoordinateDraft
) {
  if (suggestion.status !== "pending" && suggestion.status !== "needs_location") {
    return false;
  }

  if (hasSuggestionGps(suggestion)) {
    return true;
  }

  return getDraftCoordinates(draft).valid;
}

function canRejectSuggestion(suggestion: TrailSuggestion) {
  return suggestion.status === "pending" || suggestion.status === "needs_location";
}

export function TrailSuggestionsAdminClient() {
  const { user, session, authLoading } = useAuth();

  const [suggestions, setSuggestions] = useState<TrailSuggestion[]>([]);
  const [coordinateDrafts, setCoordinateDrafts] = useState<
    Record<string, CoordinateDraft>
  >({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accessToken = session?.access_token;

  const pendingCount = useMemo(
    () =>
      suggestions.filter(
        (suggestion) =>
          suggestion.status === "pending" || suggestion.status === "needs_location"
      ).length,
    [suggestions]
  );

  async function loadSuggestions() {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getAdminTrailSuggestions(accessToken);
      setSuggestions(data);

      setCoordinateDrafts((currentDrafts) => {
        const nextDrafts: Record<string, CoordinateDraft> = {};

        data.forEach((suggestion) => {
          const existingDraft = currentDrafts[suggestion.id];

          nextDrafts[suggestion.id] = {
            latitude:
              existingDraft?.latitude ??
              (typeof suggestion.latitude === "number"
                ? String(suggestion.latitude)
                : ""),
            longitude:
              existingDraft?.longitude ??
              (typeof suggestion.longitude === "number"
                ? String(suggestion.longitude)
                : ""),
          };
        });

        return nextDrafts;
      });
    } catch {
      setError("Unable to load trail suggestions. Admin access may be required.");
    } finally {
      setLoading(false);
    }
  }

  function updateCoordinateDraft(
    suggestionId: string,
    field: keyof CoordinateDraft,
    value: string
  ) {
    setCoordinateDrafts((currentDrafts) => ({
      ...currentDrafts,
      [suggestionId]: {
        latitude: currentDrafts[suggestionId]?.latitude ?? "",
        longitude: currentDrafts[suggestionId]?.longitude ?? "",
        [field]: value,
      },
    }));
  }

  async function approve(suggestion: TrailSuggestion) {
    if (!accessToken) return;

    const draft = coordinateDrafts[suggestion.id];
    const hasGps = hasSuggestionGps(suggestion);
    const draftCoordinates = getDraftCoordinates(draft);

    if (!hasGps && !draftCoordinates.valid) {
      setError("Enter valid latitude and longitude before approving.");
      return;
    }

    setBusyId(suggestion.id);
    setError(null);

    try {
      await approveTrailSuggestion(
        suggestion.id,
        accessToken,
        hasGps
          ? undefined
          : {
              latitude: draftCoordinates.latitude,
              longitude: draftCoordinates.longitude,
            }
      );

      await loadSuggestions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to approve trail suggestion."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    if (!accessToken) return;

    setBusyId(id);
    setError(null);

    try {
      await rejectTrailSuggestion(id, accessToken);
      await loadSuggestions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reject trail suggestion."
      );
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (authLoading) return;

    if (!user || !accessToken) {
      setLoading(false);
      return;
    }

    void loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, accessToken]);

  if (authLoading || loading) {
    return (
      <main className="space-y-3 pb-28">
        <section className="card p-6">
          <p className="text-helper text-zinc-400">Loading trail suggestions...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="space-y-3 pb-28">
        <section className="card p-6">
          <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
            Admin
          </h1>
          <p className="text-helper mt-2 text-zinc-400">
            Sign in with an admin account to view trail suggestions.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-3 pb-28">
      <section className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
              Trail Suggestions
            </h1>

            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Review | Approve | Reject
            </p>
          </div>

          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
            {pendingCount} pending
          </span>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </section>

      {suggestions.length ? (
        suggestions.map((suggestion) => {
          const hasGps = hasSuggestionGps(suggestion);
          const draft = coordinateDrafts[suggestion.id];
          const draftCoordinates = getDraftCoordinates(draft);
          const approveEnabled = canApproveSuggestion(suggestion, draft);
          const rejectEnabled = canRejectSuggestion(suggestion);
          const canEditCoordinates =
            suggestion.status === "pending" || suggestion.status === "needs_location";

          return (
            <section key={suggestion.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
                    {suggestion.trail_name}
                  </h2>

                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                    @{suggestion.username || "rider"}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusClassName(
                    suggestion.status
                  )}`}
                >
                  {formatStatus(suggestion.status)}
                </span>
              </div>

              <div className="my-3 h-px bg-zinc-800" />

              <div className="space-y-2 text-helper text-zinc-400">
                {suggestion.system_name ? (
                  <p>Trail System: {suggestion.system_name}</p>
                ) : null}

                <p>
                  Location: {suggestion.city || "Unknown"}
                  {suggestion.state ? `, ${suggestion.state}` : ""}
                </p>

                {hasGps ? (
                  <p>
                    GPS: {suggestion.latitude?.toFixed(5)},{" "}
                    {suggestion.longitude?.toFixed(5)}
                  </p>
                ) : (
                  <p className="text-amber-300">
                    GPS: Missing — enter coordinates before approval.
                  </p>
                )}

                {suggestion.notes ? <p>Notes: {suggestion.notes}</p> : null}
              </div>

              {!hasGps && canEditCoordinates ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                    Admin Coordinates
                  </p>

                  <p className="text-helper mt-1 text-zinc-500">
                    Add latitude and longitude before approving this trail.
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                      aria-label="Latitude"
                      className="input"
                      inputMode="decimal"
                      value={draft?.latitude ?? ""}
                      onChange={(event) =>
                        updateCoordinateDraft(
                          suggestion.id,
                          "latitude",
                          event.target.value
                        )
                      }
                      placeholder="Latitude"
                    />

                    <input
                      aria-label="Longitude"
                      className="input"
                      inputMode="decimal"
                      value={draft?.longitude ?? ""}
                      onChange={(event) =>
                        updateCoordinateDraft(
                          suggestion.id,
                          "longitude",
                          event.target.value
                        )
                      }
                      placeholder="Longitude"
                    />
                  </div>

                  {draft?.latitude || draft?.longitude ? (
                    draftCoordinates.valid ? (
                      <p className="text-helper mt-2 text-emerald-300">
                        Coordinates look valid.
                      </p>
                    ) : (
                      <p className="text-helper mt-2 text-amber-300">
                        Enter latitude between -90 and 90 and longitude between
                        -180 and 180.
                      </p>
                    )
                  ) : null}
                </div>
              ) : null}

              {suggestion.status === "pending" ||
              suggestion.status === "needs_location" ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!approveEnabled || busyId === suggestion.id}
                    onClick={() => void approve(suggestion)}
                    className={`btn-primary ${
                      !approveEnabled || busyId === suggestion.id
                        ? "cursor-not-allowed opacity-60 saturate-50"
                        : ""
                    }`}
                    title={
                      !approveEnabled
                        ? "Valid GPS coordinates required before approval"
                        : undefined
                    }
                  >
                    {busyId === suggestion.id ? "Working..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    disabled={!rejectEnabled || busyId === suggestion.id}
                    onClick={() => void reject(suggestion.id)}
                    className={`btn-secondary ${
                      !rejectEnabled || busyId === suggestion.id
                        ? "cursor-not-allowed opacity-60 saturate-50"
                        : ""
                    }`}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </section>
          );
        })
      ) : (
        <section className="card p-5">
          <p className="text-helper text-zinc-400">No trail suggestions yet.</p>
        </section>
      )}
    </main>
  );
}