"use client";

import Link from "next/link";
import { useState } from "react";
import { createReport } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import type { Trail } from "@/lib/types";

const primaryConditions = ["Hero", "Dry", "Damp", "Muddy", "Flooded", "Closed"];

const hazardTags = [
  { value: "Obstruction", icon: "🌳" },
  { value: "Bees", icon: "🐝" },
  { value: "Wildlife", icon: "🐾" },
  { value: "Other", icon: "⚠️" },
];

export function QuickReportModal({
  trail,
  distanceMeters,
  reportSource,
  onClose,
  onSuccess,
}: {
  trail: Trail;
  distanceMeters?: number | null;
  reportSource?: "selected" | "nearest" | "fallback" | "none";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { session } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [primaryCondition, setPrimaryCondition] = useState("Dry");
  const [hazards, setHazards] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const accessToken = session?.access_token;
    const distanceLabel =
    typeof distanceMeters === "number"
      ? `${(distanceMeters / 1609.344).toFixed(distanceMeters < 1609.344 ? 1 : 0)} mi away`
      : null;

  const sourceLabel =
    reportSource === "nearest"
      ? "Nearest trail"
      : reportSource === "selected"
        ? "Selected trail"
        : "Reporting for";

  function toggleHazard(tag: string) {
    setHazards((prev) =>
      prev.includes(tag) ? prev.filter((h) => h !== tag) : [...prev, tag]
    );
  }

  async function submit() {
    if (!accessToken || submitting) return;

    setSubmitting(true);

    try {
      await createReport(
        {
          trail_id: trail.id,
          primary_condition: primaryCondition,
          hazard_tags: hazards,
          note,
        },
        accessToken
      );

      onSuccess();
      onClose();
    } catch {
      alert("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  }

    if (!accessToken) {
        return (
        <div className="fixed inset-0 z-[2000] flex items-end bg-black/60 backdrop-blur-sm">
            <div className="w-full space-y-4 rounded-t-2xl border-t border-zinc-800 bg-zinc-950 p-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Quick Report
                </p>

                <h2 className="mt-1 font-brand text-xl font-semibold uppercase text-zinc-100">
                Sign in required
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                Sign in to submit trail reports and help keep conditions current.
                </p>
            </div>

            <Link
                href="/auth/login?next=/trails?view=map"
                className="btn-primary block w-full text-center"
            >
                Sign in to report
            </Link>

            <button onClick={onClose} className="w-full text-xs text-zinc-500">
                Cancel
            </button>
            </div>
        </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end">
        <div className="w-full rounded-t-2xl bg-zinc-950 p-4 space-y-4 border-t border-zinc-800">

                {/* Header */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Quick Report
          </p>

          <h2 className="mt-1 font-brand text-xl font-semibold uppercase text-zinc-100">
            {trail.name}
          </h2>

          <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
            {sourceLabel}
            {distanceLabel ? ` · ${distanceLabel}` : ""}
          </p>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-2">
            {primaryConditions.map((c) => {
              const active = primaryCondition === c;

              return (
                <button
                  key={c}
                  onClick={() => {
                    setPrimaryCondition(c);
                    setStep(2);
                  }}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-zinc-900 text-zinc-300"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <div className="flex flex-wrap gap-2">
              {hazardTags.map((tag) => {
                const active = hazards.includes(tag.value);

                return (
                  <button
                    key={tag.value}
                    onClick={() => toggleHazard(tag.value)}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      active
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {tag.icon} {tag.value}
                  </button>
                );
              })}
            </div>

            <textarea
              placeholder="Optional note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input min-h-[80px]"
            />

            <button
              onClick={submit}
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full text-xs text-zinc-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}