"use client";

import { useMemo, useRef, useState } from "react";
import type { Trail, TrailReport } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";
import { ReportAccess } from "@/components/ReportAccess";
import { RecentReports } from "@/components/RecentReports";
import { getConditionColor, timeAgo } from "@/lib/utils";

type TrailSummaryDebug = {
  resolution_reason?: string | null;
};

type TrailWithDebugSummary = Trail & {
  summary?: Trail["summary"] & {
    debug?: TrailSummaryDebug;
  };
};

function getResolutionReason(trail: Trail) {
  return (trail as TrailWithDebugSummary).summary?.debug?.resolution_reason;
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

  return `${displayCondition} — no recent confirmations`;
}

function formatHazards(hazards?: string[]) {
  if (!hazards?.length) return null;
  return hazards.join(", ");
}

function isFreshReport(report: TrailReport, freshnessHours: number) {
  const timestamp = report.updated_at || report.created_at;
  if (!timestamp) return false;

  const reportTime = new Date(timestamp).getTime();
  const cutoff = Date.now() - freshnessHours * 60 * 60 * 1000;

  return reportTime >= cutoff;
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
  const freshnessHours = trail.summary?.freshness_hours ?? 3;

  const freshReports = useMemo(
    () => reports.filter((report) => isFreshReport(report, freshnessHours)),
    [reports, freshnessHours]
  );

  const hazards = trail.summary?.recent_hazards ?? [];
  const hazardText = formatHazards(hazards);

  const updatedText = useMemo(() => {
    const reason = getResolutionReason(trail);

    if (
      reason &&
      [
        "active_rain",
        "no_drying_window_heavy_rain",
        "no_drying_window",
        "insufficient_drying_time",
        "recovered",
        "recent_rain_unavailable",
        "permanently_closed",
      ].includes(reason)
    ) {
      return "Status updated from weather and recovery signals";
    }

    if (trail.summary?.last_updated_at) {
      return `Last rider update ${timeAgo(trail.summary.last_updated_at)}`;
    }

    if (trail.last_reported_at) {
      return `Last rider update ${timeAgo(trail.last_reported_at)}`;
    }

    return "No recent rider updates";
  }, [trail]);

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
            <p className="mt-1 text-sm text-zinc-400">{updatedText}</p>
          </div>

          <div className="space-y-1 text-sm text-zinc-300">
            {freshReports.length > 0 ? (
              <button
                type="button"
                onClick={expandReports}
                className="text-left text-emerald-300 underline-offset-4 transition hover:text-emerald-200 hover:underline"
              >
                Reports:{" "}
                <span className="font-semibold">{freshReports.length}</span>
              </button>
            ) : (
              <p>
                Reports: <span className="text-zinc-100">0</span>
              </p>
            )}

            {hazardText ? (
              <p className="text-amber-300">Hazards: {hazardText}</p>
            ) : (
              <p className="text-emerald-300">No hazards reported</p>
            )}
          </div>
        </div>
      </section>

      <section ref={recentReportsRef}>
        <RecentReports
          reports={freshReports}
          expanded={reportsExpanded}
          onExpandedChange={setReportsExpanded}
        />
      </section>

      <section className="card p-5">
        <button
          type="button"
          onClick={() => setReportFormOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-4 text-left"
          aria-expanded={reportFormOpen}
        >
          <div>
            <p className="font-brand text-section-title font-semibold uppercase text-zinc-100">
              Report Conditions
            </p>
            <p className="text-helper mt-1 text-zinc-400">
              Tap here to submit trail conditions or hazards
            </p>
          </div>

          <span className="text-sm text-zinc-400">
            {reportFormOpen ? "▲" : "▼"}
          </span>
        </button>

        {reportFormOpen ? (
          <>
            <div className="my-4 h-px bg-zinc-800" />

            <ReportAccess trailId={trail.id} trailName={trail.name} />
          </>
        ) : null}
      </section>
    </main>
  );
}