"use client";

import Link from "next/link";
import { useState } from "react";
import { LocateFixed, MapPinned, Send } from "lucide-react";
import { createTrailSuggestion } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { Geolocation } from "@capacitor/geolocation";

type LocationPayload = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

async function getCurrentLocation(): Promise<LocationPayload | null> {
  try {
    const permission = await Geolocation.requestPermissions();

    if (
      permission.location !== "granted" &&
      permission.coarseLocation !== "granted"
    ) {
      return null;
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 15000,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
    };
  } catch {
    return null;
  }
}

export function SuggestTrailForm() {
  const { user, session } = useAuth();

  const [trailName, setTrailName] = useState("");
  const [systemName, setSystemName] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState<LocationPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessToken = session?.access_token;
  const canSubmit = trailName.trim().length >= 2 && !!accessToken && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !accessToken) return;

    setSubmitting(true);
    setLocating(true);
    setError(null);

    try {
      const nextLocation = await getCurrentLocation();

      if (!nextLocation) {
        setError(
          "We need your current location to place this trail on the map. Allow location access and try again."
        );
        return;
      }

      setLocation(nextLocation);
      setLocating(false);

      await createTrailSuggestion(
        {
          trail_name: trailName,
          system_name: systemName,
          city,
          state: stateValue,
          latitude: nextLocation.latitude,
          longitude: nextLocation.longitude,
          location_accuracy_meters: nextLocation.accuracy,
          notes,
        },
        accessToken
      );

      setSubmitted(true);
    } catch {
      setError("Unable to submit trail add request right now.");
    } finally {
      setSubmitting(false);
      setLocating(false);
    }
  }

  function resetForm() {
    setTrailName("");
    setSystemName("");
    setCity("");
    setStateValue("");
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

          <div className="min-w-0 flex-1 space-y-0.5">
            <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
              Add a Trail
            </h2>

            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Help expand coverage
            </p>
          </div>
        </div>

        <div className="my-3 h-px bg-zinc-800" />

        <p className="text-helper text-zinc-400">
          <Link
            href="/auth/login?next=/help"
            className="font-semibold text-emerald-300 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>{" "}
          to submit a trail or trail system for Ride Recon admin review.
        </p>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="card p-5">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="font-brand text-section-title font-semibold uppercase text-emerald-300">
            Trail Add Request Sent
          </p>

          <p className="text-helper mt-2 text-zinc-300">
            Thanks for the intel. An admin will review the location before it
            appears in Ride Recon.
          </p>
        </div>

        <button
          type="button"
          onClick={resetForm}
          className="btn-secondary mt-4 w-full"
        >
          Add Another Trail
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
            Add a Trail
          </h2>

          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Admin reviewed before publishing
          </p>
        </div>
      </div>

      <div className="my-3 h-px bg-zinc-800" />

      <div className="space-y-3">
        <p className="text-helper text-zinc-400">
          We’ll attach your current GPS location for admin review. If you’re not at the trail, add landmark details in the notes.
        </p>

        <div className="space-y-2">
          <input
            aria-label="Trail or park name"
            className="input"
            value={trailName}
            onChange={(e) => setTrailName(e.target.value)}
            placeholder="Trail or park name"
          />

          <input
            aria-label="Trail system"
            className="input"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            placeholder="Trail System / optional"
          />

          <div className="grid grid-cols-[1fr_76px] gap-2">
            <input
              aria-label="City"
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City / optional"
            />

            <input
              aria-label="State"
              className="input"
              value={stateValue}
              onChange={(e) => {
                const raw = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                setStateValue(raw.slice(0, 2));
              }}
              placeholder="ST"
              maxLength={2}
            />
          </div>
        </div>

        {location ? (
          <p className="text-helper flex items-center gap-2 text-emerald-300">
            <LocateFixed className="h-4 w-4" />
            GPS captured: {location.latitude.toFixed(5)},{" "}
            {location.longitude.toFixed(5)}
          </p>
        ) : (
          <p className="text-helper text-zinc-500">
            GPS will be captured when you submit.
          </p>
        )}

        <textarea
          aria-label="Notes"
          className="input min-h-24"
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes/example: trailhead, parking area, private ranch, MTB trails, race venue, or landmark details."
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`btn-primary flex w-full items-center justify-center gap-2 ${
            !canSubmit ? "cursor-not-allowed opacity-60 saturate-50" : ""
          }`}
        >
          <Send className="h-4 w-4" />
          {locating
            ? "Getting Location..."
            : submitting
              ? "Submitting..."
              : "Submit Trail Location"}
        </button>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    </section>
  );
}