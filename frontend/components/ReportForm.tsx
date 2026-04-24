"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReport } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const primaryConditions = ["Hero", "Dry", "Damp", "Muddy", "Flooded", "Closed"];

const hazardTags = [
  { value: "Obstruction", icon: "🌳" },
  { value: "Bees", icon: "🐝" },
  { value: "Wildlife", icon: "🐾" },
  { value: "Other", icon: "⚠️" },
];

type HazardLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function getCurrentLocation(): Promise<HazardLocation | null> {
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
        timeout: 8000,
        maximumAge: 30000,
      }
    );
  });
}

export function ReportForm({
  trailId,
  trailName,
}: {
  trailId: string;
  trailName: string;
}) {
  const router = useRouter();
  const { session } = useAuth();

  const [primaryCondition, setPrimaryCondition] = useState("Dry");
  const [selectedHazards, setSelectedHazards] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const accessToken = session?.access_token;
  const hasHazards = selectedHazards.length > 0;

  function toggleHazard(tag: string) {
    setSelectedHazards((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setMessage(null);
    setMessageType(null);

    if (!accessToken) {
      setMessage("Please sign in again before submitting a report.");
      setMessageType("error");
      setSubmitting(false);
      return;
    }

    try {
      const location = hasHazards ? await getCurrentLocation() : null;

      const result = await createReport(
        {
          trail_id: trailId,
          primary_condition: primaryCondition,
          hazard_tags: selectedHazards,
          note,
          hazard_latitude: location?.latitude ?? null,
          hazard_longitude: location?.longitude ?? null,
          hazard_location_accuracy_meters: location?.accuracy ?? null,
        },
        accessToken
      );

      setMessage(result.message);
      setMessageType("success");
      setNote("");
      setSelectedHazards([]);
      setPrimaryCondition("Dry");

      router.refresh();

      window.setTimeout(() => {
        window.location.reload();
      }, 350);
    } catch {
      setMessage("Unable to submit report right now.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <p className="text-helper text-zinc-400">
        Nearest trail confirmed as {trailName}
      </p>

      <div>
        <p className="label">Primary condition</p>

        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-800">
          <div className="grid grid-cols-2">
            {primaryConditions.map((condition, index) => {
              const active = primaryCondition === condition;
              const isLeftCol = index % 2 === 0;
              const isTopRow = index < 2;

              return (
                <label
                  key={condition}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition
                    ${!isTopRow ? "border-t border-zinc-800" : ""}
                    ${!isLeftCol ? "border-l border-zinc-800" : ""}
                    ${
                      active
                        ? "bg-emerald-500/8 text-zinc-100"
                        : "bg-transparent text-zinc-300 hover:bg-zinc-900/60"
                    }
                  `}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border transition ${
                      active ? "border-emerald-400" : "border-zinc-600"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full transition ${
                        active ? "bg-emerald-400" : "bg-transparent"
                      }`}
                    />
                  </span>

                  <span className={active ? "font-medium text-zinc-100" : ""}>
                    {condition}
                  </span>

                  <input
                    type="radio"
                    name="primaryCondition"
                    value={condition}
                    checked={active}
                    onChange={() => setPrimaryCondition(condition)}
                    className="sr-only"
                  />
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <p className="label">Hazards</p>
        <p className="text-helper mt-1 text-zinc-500">
          Hazard reports will try to use your current location for map
          placement.
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {hazardTags.map((tag) => {
            const active = selectedHazards.includes(tag.value);

            return (
              <button
                type="button"
                key={tag.value}
                onClick={() => toggleHazard(tag.value)}
                aria-pressed={active}
                className={
                  active
                    ? "rounded-xl border border-amber-500 bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-300 transition"
                    : "rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-700"
                }
              >
                <span className="mr-1">{tag.icon}</span>
                {tag.value}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">Notes (optional, 255 chars max)</label>
        <textarea
          className="input mt-2 min-h-28"
          maxLength={255}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Example: tree down about 2 miles south of the trailhead"
        />
      </div>

      <button
        className={`btn-primary w-full transition ${
          submitting ? "cursor-not-allowed opacity-60 saturate-50" : ""
        }`}
        disabled={submitting}
        type="submit"
      >
        {submitting
          ? hasHazards
            ? "Pinning location..."
            : "Submitting..."
          : "Submit report"}
      </button>

      {message ? (
        <p
          className={`text-sm ${
            messageType === "error" ? "text-rose-300" : "text-emerald-300"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}