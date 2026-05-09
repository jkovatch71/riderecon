"use client";

import Link from "next/link";
import { useState } from "react";
import { LocateFixed, MapPinned, Send } from "lucide-react";
import { createTrailSuggestion } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type LocationPayload = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function getCurrentLocation(): Promise<LocationPayload | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000,
      }
    );
  });
}

export function SuggestTrailForm() {
  const { user, session } = useAuth();

  const [trailName, setTrailName] = useState("");
  const [systemName, setSystemName] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState<LocationPayload | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessToken = session?.access_token;
  const canSubmit = trailName.trim().length >= 2 && !!accessToken && !submitting;

  async function handleUseLocation() {
    setLocating(true);
    setError(null);

    try {
      const nextLocation = await getCurrentLocation();

      if (!nextLocation) {
        setError("Unable to capture location. You can still submit without GPS.");
        return;
      }

      setLocation(nextLocation);
    } finally {
      setLocating(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !accessToken) return;

    setSubmitting(true);
    setError(null);

    try {
      await createTrailSuggestion(
        {
          trail_name: trailName,
          system_name: systemName,
          city,
          state: stateValue,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          location_accuracy_meters: location?.accuracy ?? null,
          notes,
        },
        accessToken
      );

      setSubmitted(true);
    } catch {
      setError("Unable to submit trail suggestion right now.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setTrailName("");
    setSystemName("");
    setCity("");
    setStateValue("TX");
    setNotes("");
    setLocation(null);
    setError(null);
    setSubmitted(false);
  }

  if (!user) {
    return (
      <section className="card p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-300">
            <MapPinned className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
              Suggest a Trail
            </h2>
            <p className="mt-1 text-helper text-zinc-400">
              Sign in to suggest a trail or trail system for Ride Recon coverage.
            </p>

            <Link href="/auth/login?next=/help" className="btn-primary mt-4 inline-block">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="card p-5">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="font-brand text-section-title font-semibold uppercase text-emerald-300">
            Trail Suggestion Sent
          </p>

          <p className="text-helper mt-2 text-zinc-300">
            Thanks for the intel. We’ll review it before adding it to Ride Recon.
          </p>
        </div>

        <button type="button" onClick={resetForm} className="btn-secondary mt-4 w-full">
          Suggest Another
        </button>
      </section>
    );
  }

  return (
    <section className="card p-5">
        <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-300">
            <MapPinned className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
            <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
            Suggest a Trail
            </h2>

            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Help expand coverage
            </p>
        </div>
        </div>

        <div className="my-3 h-px bg-zinc-800" />

        <div className="space-y-4">
        <div>
            <label className="label">Trail or Park Name</label>
            <input
            className="input mt-2"
            value={trailName}
            onChange={(e) => setTrailName(e.target.value)}
            placeholder="Example: Flat Rock Ranch"
            />
        </div>

        <div>
            <label className="label">System Name</label>
            <input
            className="input mt-2"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            placeholder="Optional"
            />
        </div>

        <div className="grid grid-cols-[1fr_76px] gap-2">
            <div>
            <label className="label">City</label>
            <input
                className="input mt-2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Comfort"
            />
            </div>

            <div>
            <label className="label">State</label>
                <input
                    className="input mt-2"
                    value={stateValue}
                    onChange={(e) => {
                        const raw = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                        setStateValue(raw.slice(0, 2));
                    }}
                    placeholder="TX"
                    maxLength={2}
                    />
            </div>
        </div>

        <button
            type="button"
            onClick={handleUseLocation}
            disabled={locating}
            className="btn-secondary flex w-full items-center justify-center gap-2"
        >
            <LocateFixed className="h-4 w-4" />
            {locating ? "Capturing Location..." : "Use My Current Location"}
        </button>

        {location ? (
            <p className="text-helper text-emerald-300">
            GPS captured: {location.latitude.toFixed(5)},{" "}
            {location.longitude.toFixed(5)}
            </p>
        ) : (
            <p className="text-helper text-zinc-500">
            GPS is optional, but it helps place the trail faster.
            </p>
        )}

        <div>
            <label className="label">Notes</label>
            <textarea
            className="input mt-2 min-h-24"
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Example: Private ranch, MTB trails, race venue, good candidate for future coverage."
            />
        </div>

        <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`btn-primary flex w-full items-center justify-center gap-2 ${
            !canSubmit ? "cursor-not-allowed opacity-60 saturate-50" : ""
            }`}
        >
            <Send className="h-4 w-4" />
            {submitting ? "Sending..." : "Submit Suggestion"}
        </button>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
    </section>
    );
}