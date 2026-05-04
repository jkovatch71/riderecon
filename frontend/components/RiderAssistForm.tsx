"use client";

import { useState } from "react";
import {
  Bike,
  CircleDot,
  Cross,
  HelpCircle,
  Wrench,
  Zap,
} from "lucide-react";
import {
  createRiderAssistRequest,
  type RiderAssistType,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type AssistOption = {
  type: RiderAssistType;
  label: string;
  icon: React.ElementType;
  helper: string;
};

const assistOptions: AssistOption[] = [
  {
    type: "flat",
    label: "Flat",
    icon: CircleDot,
    helper: "Tube, plug, patch, or tire help",
  },
  {
    type: "mechanical",
    label: "Mechanical",
    icon: Bike,
    helper: "Bike issue, chain, brake, shifting",
  },
  {
    type: "tool",
    label: "Tool",
    icon: Wrench,
    helper: "Need a tool or quick assist",
  },
  {
    type: "co2",
    label: "CO₂",
    icon: Zap,
    helper: "Need air, CO₂, or pump",
  },
  {
    type: "crash",
    label: "Crash",
    icon: Cross,
    helper: "Crash or possible injury",
  },
  {
    type: "other",
    label: "Other",
    icon: HelpCircle,
    helper: "Something else trail-side",
  },
];

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

export function RiderAssistForm() {
  const { user, session } = useAuth();

  const [assistType, setAssistType] = useState<RiderAssistType>("flat");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null
  );

  const accessToken = session?.access_token;

  async function submitAssistRequest() {
    if (!user || !accessToken || submitting) return;

    setSubmitting(true);
    setMessage(null);
    setMessageType(null);

    try {
      const location = await getCurrentLocation();

      const result = await createRiderAssistRequest(
        {
          assist_type: assistType,
          note,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          location_accuracy_meters: location?.accuracy ?? null,
        },
        accessToken
      );

      setMessage(result.message);
      setMessageType("success");
      setNote("");
    } catch {
      setMessage("Unable to post assist request right now.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <section className="card p-5">
        <div className="space-y-1">
          <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
            Rider Assist
          </h2>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Sign in required
          </p>
        </div>

        <div className="my-3 h-px bg-zinc-800" />

        <p className="text-helper text-zinc-400">
          Sign in to request help for a flat, mechanical issue, missing tool,
          CO₂, crash, or other trail-side problem.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <div className="space-y-1">
        <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
          Rider Assist
        </h2>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Drop a help pin
        </p>
      </div>

      <div className="my-3 h-px bg-zinc-800" />

      <p className="text-helper text-zinc-400">
        Pick what you need. Ride Recon will try to pin your current location.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {assistOptions.map((option) => {
          const Icon = option.icon;
          const active = assistType === option.type;

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => setAssistType(option.type)}
              aria-pressed={active}
              className={`rounded-2xl border p-3 text-center transition active:scale-[0.98] ${
                active
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                  : "border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <Icon className="mx-auto h-6 w-6" />
              <span className="mt-2 block text-xs font-semibold uppercase tracking-wide">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-helper mt-3 text-zinc-500">
        {assistOptions.find((option) => option.type === assistType)?.helper}
      </p>

      <div className="mt-4">
        <label className="label">Note</label>
        <textarea
          className="input mt-2 min-h-24"
          maxLength={255}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Example: flat near the creek crossing, need CO₂"
        />
      </div>

      <button
        type="button"
        onClick={submitAssistRequest}
        disabled={submitting}
        className={`btn-primary mt-4 w-full ${
          submitting ? "cursor-wait opacity-60 saturate-50" : ""
        }`}
      >
        {submitting ? "Dropping pin..." : "Request Assist"}
      </button>

      {message ? (
        <p
          className={`mt-3 text-sm ${
            messageType === "error" ? "text-rose-300" : "text-emerald-300"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}