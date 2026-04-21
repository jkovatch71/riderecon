import Link from "next/link";
import { getTrail, getTrailReports } from "@/lib/api";
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

function resolvedCondition(trail: Awaited<ReturnType<typeof getTrail>>) {
  return trail.summary?.display_condition || trail.current_condition || "Unknown";
}

function resolvedColor(trail: Awaited<ReturnType<typeof getTrail>>) {
  return (
    trail.summary?.display_status_color ||
    getConditionColor(resolvedCondition(trail))
  );
}

function confirmationLine(trail: Awaited<ReturnType<typeof getTrail>>) {
  const displayCondition = resolvedCondition(trail);
  const riderCount = trail.summary?.reported_by_count ?? 0;

  if (riderCount > 0) {
    return `${displayCondition} — confirmed by ${riderCount} rider${riderCount === 1 ? "" : "s"}`;
  }

  return `${displayCondition} — no recent confirmations`;
}

export default async function TrailDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const trail = await getTrail(params.id);
  const reports = await getTrailReports(params.id);

  if (!trail) {
    return (
      <main className="space-y-5 pb-4">
        <div className="card p-6">
          <h1 className="text-2xl font-bold">Trail not found</h1>
          <p className="mt-2 text-sm text-zinc-400">
            The trail you requested could not be found.
          </p>
          <Link href="/" className="btn-primary mt-4 inline-block">
            Back to trails
          </Link>
        </div>
      </main>
    );
  }

  const displayCondition = resolvedCondition(trail);
  const displayColor = resolvedColor(trail);

  const freshnessText = trail.summary?.last_updated_at
    ? timeAgo(trail.summary.last_updated_at)
    : trail.last_reported_at
      ? timeAgo(trail.last_reported_at)
      : "unknown";

  const hasHazards = (trail.summary?.recent_hazards?.length ?? 0) > 0;

  return (
    <main className="space-y-3 pb-4">
      <section className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
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
              Report count: <span className="text-zinc-100">{trail.report_count}</span>
            </p>

            {trail.summary?.freshness_hours ? (
              <p>
                Freshness window:{" "}
                <span className="text-zinc-100">
                  last {trail.summary.freshness_hours} hours
                </span>
              </p>
            ) : null}

            <p>
              Weather:{" "}
              <span className="text-zinc-100">
                {trail.weather_warning || "No warning"}
              </span>
            </p>

            {trail.recovery_profile ? (
              <p>
                Recovery Profile:{" "}
                <span className="text-zinc-100">
                  {recoveryLabel(trail.recovery_profile.recovery_class)}
                  {trail.recovery_profile.average_recovery_hours
                    ? ` (${trail.recovery_profile.average_recovery_hours}h typical dry time)`
                    : ""}
                </span>
              </p>
            ) : null}

            {hasHazards ? (
              <p className="text-amber-300">
                Hazards: {trail.summary?.recent_hazards?.join(", ")}
              </p>
            ) : (
              <p className="text-emerald-300">No hazards reported</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <ReportAccess trailId={trail.id} trailName={trail.name} />
        </div>

        <div className="space-y-4">
          <RecentReports reports={reports} />
        </div>
      </section>
    </main>
  );
}