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

type ReportSource = "selected" | "nearest" | "fallback" | "none";

type QuickReportModalProps = {
  trail: Trail;
  distanceMeters?: number | null;
  reportSource?: ReportSource;
  onClose: () => void;
  onSuccess: () => void;
};

function formatDistance(distanceMeters?: number | null) {
  if (typeof distanceMeters !== "number") return null;

  const miles = distanceMeters / 1609.344;
  const precision = miles < 1 ? 1 : 0;

  return `${miles.toFixed(precision)} mi away`;
}

function getSourceLabel(reportSource?: ReportSource) {
  if (reportSource === "nearest") return "Nearest trail";
  if (reportSource === "selected") return "Selected trail";
  return "Reporting for";
}

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-end bg-black/60 pb-[calc(72px+env(safe-area-inset-bottom))] backdrop-blur-sm">
      <div className="mx-4 mb-3 w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function QuickReportModal({
  trail,
  distanceMeters,
  reportSource,
  onClose,
  onSuccess,
}: QuickReportModalProps) {
  const { session } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [primaryCondition, setPrimaryCondition] = useState("Dry");
  const [hazards, setHazards] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const accessToken = session?.access_token;
  const distanceLabel = formatDistance(distanceMeters);
  const sourceLabel = getSourceLabel(reportSource);

  function toggleHazard(tag: string) {
    setHazards((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
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
      <ModalShell>
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

        <button type="button" onClick={onClose} className="w-full text-xs text-zinc-500">
          Cancel
        </button>
      </ModalShell>
    );
  }

  return (
    <ModalShell>
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

      {step === 1 ? (
        <div className="grid grid-cols-2 gap-2">
          {primaryConditions.map((condition) => {
            const active = primaryCondition === condition;

            return (
              <button
                key={condition}
                type="button"
                onClick={() => {
                  setPrimaryCondition(condition);
                  setStep(2);
                }}
                className={`rounded-xl px-3 py-3 text-sm font-medium transition active:scale-[0.98] ${
                  active
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-zinc-900 text-zinc-300"
                }`}
              >
                {condition}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {hazardTags.map((tag) => {
              const active = hazards.includes(tag.value);

              return (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleHazard(tag.value)}
                  className={`rounded-xl px-3 py-2 text-sm transition active:scale-[0.98] ${
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
            onChange={(event) => setNote(event.target.value)}
            className="input min-h-[80px]"
            maxLength={255}
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary w-full"
            >
              Back
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className={`btn-primary w-full ${
                submitting ? "cursor-not-allowed opacity-60 saturate-50" : ""
              }`}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </>
      )}

      <button type="button" onClick={onClose} className="w-full text-xs text-zinc-500">
        Cancel
      </button>
    </ModalShell>
  );
}