"use client";

import { useMemo, useRef, useState } from "react";
import type { Trail, TrailReport } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";
import { ReportAccess } from "@/components/ReportAccess";
import { RecentReports } from "@/components/RecentReports";
import { getConditionColor, timeAgo } from "@/lib/utils";

function recoveryLabel(recoveryClass?: string | null) {
  switch (recoveryClass) {
    case "fast":
      return "Dries Fast";
    case "average":
      return "Average Dry Time";
    case "slow":
      return "Needs More Dry Time";
    default:
      return "Unknown";
  }
}

function resolvedCondition(trail: Trail) {
  return trail.summary?.display_condition || trail.current_condition || "Unknown";
}

function resolvedColor(trail: Trail): "green" | "yellow" | "red" {
  return (
    trail.summary?.display_status_color ||
    getConditionColor(resolvedCondition(trail))
  );
}

function confirmationLine(trail: Trail) {
  const displayCondition = resolvedCondition(trail);
  const riderCount = trail.summary?.reported_by_count ?? 0;

  if (riderCount > 0) {
    return `${displayCondition} — confirmed by ${riderCount} rider${
      riderCount === 1 ? "" : "s"
    }`;
  }

  return `${displayCondition} — no fresh rider confirmations`;
}

function formatHazards(hazards?: string[]) {
  if (!hazards?.length) return null;
  return hazards.join(", ");
}

export function TrailDetailClient({
  trail,
  reports,
}: {
  trail: Trail;
  reports: TrailReport[];
}) {
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);

  const recentReportsRef = useRef<HTMLDivElement | null>(null);

  const displayCondition = resolvedCondition(trail);
  const displayColor = resolvedColor(trail);

  const freshnessText = trail.summary?.last_updated_at
    ? timeAgo(trail.summary.last_updated_at)
    : trail.last_reported_at
      ? timeAgo(trail.last_reported_at)
      : "unknown";

  const freshConfirmations = trail.summary?.reported_by_count ?? 0;
  const totalReports = trail.report_count ?? reports.length;
  const recentReportCount = reports.length;
  const hazards = trail.summary?.recent_hazards ?? [];
  const hazardText = formatHazards(hazards);

  const recoveryText = useMemo(() => {
    if (!trail.recovery_profile) return null;

    const base = recoveryLabel(trail.recovery_profile.recovery_class);
    const dryTime = trail.recovery_profile.average_recovery_hours
      ? ` (${trail.recovery_profile.average_recovery_hours}h typical dry time)`
      : "";

    return `${base}${dryTime}`;
  }, [trail.recovery_profile]);

  function expandReports() {
    setReportsExpanded(true);

    window.setTimeout(() => {
      recentReportsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  return (
    <main className="space-y-3 pb-4">
      <section className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-trail text-section-title break-words font-semibold uppercase text-zinc-100">
              {trail.name}
            </h1>
            <p className="text-helper font-medium uppercase tracking-wide text-zinc-500">
              {trail.system_name}
            </p>
          </div>

          <StatusPill color={displayColor} label={displayCondition} />
        </div>

        <div className="my-4 h-px bg-zinc-800" />

        <div className="space-y-3">
          <div>
            <p className="text-lg font-semibold text-zinc-100">
              {confirmationLine(trail)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Last updated {freshnessText}
            </p>
          </div>

          <div className="space-y-1 text-sm text-zinc-300">
            <p>
              Fresh confirmations:{" "}
              <span className="text-zinc-100">{freshConfirmations}</span>
            </p>

            {recentReportCount > 0 ? (
              <button
                type="button"
                onClick={expandReports}
                className="text-left text-emerald-300 underline-offset-4 transition hover:text-emerald-200 hover:underline"
              >
                Recent reports:{" "}
                <span className="font-semibold">{recentReportCount}</span>
              </button>
            ) : (
              <p>
                Recent reports: <span className="text-zinc-100">0</span>
              </p>
            )}

            <p>
              Total reports:{" "}
              <span className="text-zinc-100">{totalReports}</span>
            </p>

            {trail.summary?.freshness_hours ? (
              <p>
                Freshness window:{" "}
                <span className="text-zinc-100">
                  last {trail.summary.freshness_hours} hours
                </span>
              </p>
            ) : null}

            {recoveryText ? (
              <p>
                Recovery profile:{" "}
                <span className="text-zinc-100">{recoveryText}</span>
              </p>
            ) : null}

            {hazardText ? (
              <p className="text-amber-300">Hazards: {hazardText}</p>
            ) : (
              <p className="text-emerald-300">No hazards reported</p>
            )}
          </div>
        </div>
      </section>

      <section className="card p-5">
        {!reportFormOpen ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-brand text-section-title font-semibold uppercase text-zinc-100">
                Report Conditions
              </p>
              <p className="text-helper mt-1 text-zinc-400">
                Share fresh trail intel when something changes.
              </p>
            </div>

            <button
              type="button"
              className="btn-primary shrink-0"
              onClick={() => setReportFormOpen(true)}
            >
              Report
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setReportFormOpen(false)}
              className="text-helper text-zinc-500 transition hover:text-zinc-300"
            >
              ← Hide report form
            </button>

            <ReportAccess trailId={trail.id} trailName={trail.name} />
          </div>
        )}
      </section>

      <section ref={recentReportsRef}>
        <RecentReports
          reports={reports}
          expanded={reportsExpanded}
          onExpandedChange={setReportsExpanded}
        />
      </section>
    </main>
  );
}