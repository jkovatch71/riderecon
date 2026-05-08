"use client";

import { useEffect, useState } from "react";
import {
  approveTrailSuggestion,
  getAdminTrailSuggestions,
  rejectTrailSuggestion,
  type TrailSuggestion,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export function TrailSuggestionsAdminClient() {
  const { user, session, authLoading } = useAuth();

  const [suggestions, setSuggestions] = useState<TrailSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accessToken = session?.access_token;

  async function loadSuggestions() {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getAdminTrailSuggestions(accessToken);
      setSuggestions(data);
    } catch {
      setError("Unable to load trail suggestions. Admin access may be required.");
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    if (!accessToken) return;

    setBusyId(id);
    setError(null);

    try {
      await approveTrailSuggestion(id, accessToken);
      await loadSuggestions();
    } catch {
      setError("Unable to approve trail suggestion.");
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
    } catch {
      setError("Unable to reject trail suggestion.");
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
      <main className="space-y-3 pb-4">
        <section className="card p-6">
          <p className="text-helper text-zinc-400">Loading trail suggestions...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="space-y-3 pb-4">
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
    <main className="space-y-3 pb-4">
      <section className="card p-6">
        <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
          Trail Suggestions
        </h1>

        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Review | Approve | Reject
        </p>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </section>

      {suggestions.length ? (
        suggestions.map((suggestion) => (
          <section key={suggestion.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
                  {suggestion.trail_name}
                </h2>

                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                  {suggestion.status}
                </p>
              </div>

              <span className="rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                @{suggestion.username || "rider"}
              </span>
            </div>

            <div className="my-3 h-px bg-zinc-800" />

            <div className="space-y-2 text-helper text-zinc-400">
              {suggestion.system_name ? (
                <p>System: {suggestion.system_name}</p>
              ) : null}

              <p>
                Location: {suggestion.city || "Unknown"},{" "}
                {suggestion.state || "TX"}
              </p>

              {typeof suggestion.latitude === "number" &&
              typeof suggestion.longitude === "number" ? (
                <p>
                  GPS: {suggestion.latitude.toFixed(5)},{" "}
                  {suggestion.longitude.toFixed(5)}
                </p>
              ) : (
                <p>GPS: Not provided</p>
              )}

              {suggestion.notes ? <p>Notes: {suggestion.notes}</p> : null}
            </div>

            {suggestion.status === "pending" ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busyId === suggestion.id}
                  onClick={() => void approve(suggestion.id)}
                  className="btn-primary"
                >
                  {busyId === suggestion.id ? "Working..." : "Approve"}
                </button>

                <button
                  type="button"
                  disabled={busyId === suggestion.id}
                  onClick={() => void reject(suggestion.id)}
                  className="btn-secondary"
                >
                  Reject
                </button>
              </div>
            ) : null}
          </section>
        ))
      ) : (
        <section className="card p-5">
          <p className="text-helper text-zinc-400">
            No trail suggestions yet.
          </p>
        </section>
      )}
    </main>
  );
}