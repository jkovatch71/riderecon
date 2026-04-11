"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReport } from "@/lib/api";

const primaryConditions = [
  "Hero",
  "Dry",
  "Damp",
  "Muddy",
  "Flooded",
  "Closed",
];

const hazardTags = ["Obstructed", "Bees", "Wildlife"];

export function ReportForm({
  trailId,
  trailName,
}: {
  trailId: string;
  trailName: string;
}) {
  const router = useRouter();

  const [primaryCondition, setPrimaryCondition] = useState("Dry");
  const [selectedHazards, setSelectedHazards] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleHazard(tag: string) {
    setSelectedHazards((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const result = await createReport({
        trail_id: trailId,
        primary_condition: primaryCondition,
        hazard_tags: selectedHazards,
        note,
      });

      setMessage(result.message);
      setNote("");
      setSelectedHazards([]);
      setPrimaryCondition("Dry");

      router.refresh();
    } catch {
      setMessage("Unable to submit report right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card p-5" onSubmit={onSubmit}>
      <div>
        <h3 className="text-xl font-semibold">Report Trail Conditions</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Nearest trail confirmed as {trailName}
        </p>
      </div>

      <div className="my-4 h-px bg-zinc-800" />

      <div className="space-y-5">
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
                      ${active ? "bg-emerald-500/8 text-zinc-100" : "bg-transparent text-zinc-300 hover:bg-zinc-900/60"}
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

          <div className="mt-2 flex flex-wrap gap-2">
            {hazardTags.map((tag) => {
              const active = selectedHazards.includes(tag);

              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleHazard(tag)}
                  aria-pressed={active}
                  className={
                    active
                      ? "rounded-full border border-amber-500 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-300 transition"
                      : "rounded-full border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-700"
                  }
                >
                  {tag}
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
            placeholder="Example: back half still tacky, creek crossing is slick"
          />
        </div>

        <button className="btn-primary w-full" disabled={submitting} type="submit">
          {submitting ? "Submitting..." : "Submit report"}
        </button>

        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      </div>
    </form>
  );
}