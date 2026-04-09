"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReport } from "@/lib/api";

const primaryConditions = ["Hero", "Dry", "Damp", "Muddy", "Flooded", "Closed", "Other"];
const hazardTags = ["Obstructed", "Bees", "Wildlife"];

export function ReportForm({ trailId, trailName }: { trailId: string; trailName: string }) {
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
      note
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
    <form className="card space-y-4 p-5" onSubmit={onSubmit}>
      <div>
        <h3 className="text-lg font-semibold">Report Condition</h3>
        <p className="text-sm text-zinc-400">Nearest trail confirmed as {trailName}</p>
      </div>

      <div>
        <label className="label">Primary condition</label>
        <select
          className="input min-h-12"
          style={{ fontSize: "16px" }}
          value={primaryCondition}
          onChange={(e) => setPrimaryCondition(e.target.value)}
        >
          {primaryConditions.map((item) => (
            <option key={item} value={item} style={{ fontSize: "16px" }}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="label">Hazards</span>
        <div className="flex flex-wrap gap-2">
          {hazardTags.map((tag) => {
            const active = selectedHazards.includes(tag);
            return (
              <button
                type="button"
                key={tag}
                onClick={() => toggleHazard(tag)}
                className={active ? "btn-primary" : "btn-secondary"}
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
          className="input min-h-28"
          maxLength={255}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Example: back half still tacky, creek crossing is slick"
        />
      </div>

      {/* <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
        Image upload placeholder: for MVP, images are uploaded into a manual review queue and shown as "Under review."
      </div> */}

      <button className="btn-primary w-full" disabled={submitting} type="submit">
        {submitting ? "Submitting..." : "Submit report"}
      </button>

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
    </form>
  );
}
