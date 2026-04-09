import Link from "next/link";
import { getTrail, getTrailReports } from "@/lib/api";
import { StatusPill } from "@/components/StatusPill";
import { ReportAccess } from "@/components/ReportAccess";
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

export default async function TrailDetailPage({ params }: { params: { id: string } }) {
  const trail = await getTrail(params.id);
  const reports = await getTrailReports(params.id);

  if (!trail) {
    return (
      <main className="space-y-6">
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

  return (
    <main className="space-y-6">
      <Link href="/" className="text-sm text-emerald-300">
        ← Back to trails
      </Link>

      <section className="card space-y-5 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{trail.name}</h1>
            <p className="text-zinc-400">{trail.system_name}</p>
          </div>
            <StatusPill
              color={getConditionColor(trail.current_condition)}
              label={trail.current_condition}
            />
        </div>

        <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 p-3">
            Last reported: {trail.last_reported_at ? timeAgo(trail.last_reported_at) : "Unknown"}
          </div>
          <div className="rounded-xl border border-zinc-800 p-3">
            Report count: {trail.report_count}
          </div>
          <div className="rounded-xl border border-zinc-800 p-3">
            Weather: {trail.weather_warning || "No warning"}
          </div>
        </div>
      </section>

      {trail.summary ? (
        <section className="card space-y-3 p-5">
          <div>
            <h2 className="text-lg font-semibold">Current Summary</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Based on reports from the last {trail.summary.freshness_hours} hours
            </p>
          </div>

          <div className="text-base font-medium text-zinc-100">
            {trail.summary.current_condition ?? "Unknown"} — reported by{" "}
            {trail.summary.reported_by_count} rider
            {trail.summary.reported_by_count === 1 ? "" : "s"}
          </div>

          <div className="text-sm text-zinc-300">
            Last updated{" "}
            {trail.summary.last_updated_at ? timeAgo(trail.summary.last_updated_at) : "unknown"}
            {trail.recovery_profile ? (
              <div className="text-sm text-zinc-300">
                Recovery Profile: {recoveryLabel(trail.recovery_profile.recovery_class)}
                {trail.recovery_profile.average_recovery_hours
                  ? ` (${trail.recovery_profile.average_recovery_hours}h typical dry time)`
                  : ""}
              </div>
            ) : null}
          </div>

          {trail.summary.recent_hazards?.length ? (
            <div className="text-sm text-amber-300">
              Hazards: {trail.summary.recent_hazards.join(", ")}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <ReportAccess trailId={trail.id} trailName={trail.name} />
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent reports</h2>
              <span className="text-sm text-zinc-400">Summarized history</span>
            </div>

            <div className="space-y-4">
              {reports.map((report) => (
                <article key={report.id} className="rounded-xl border border-zinc-800 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{report.username}</p>
                      <p className="text-sm text-zinc-400">{report.primary_condition}</p>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {timeAgo(report.updated_at || report.created_at)}
                    </p>
                  </div>

                  {(report.hazard_tags?.length ?? 0) > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {report.hazard_tags?.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {report.note ? (
                    <p className="mt-3 text-sm text-zinc-200">{report.note}</p>
                  ) : null}

                  {report.is_edited ? (
                    <p className="mt-2 text-xs text-zinc-500">Edited</p>
                  ) : null}

                  <div className="mt-4 flex gap-2 text-sm">
                    <button className="btn-secondary">👍</button>
                    <button className="btn-secondary">🤘</button>
                    <button className="btn-secondary">🔥</button>
                    <button className="btn-secondary">Confirm condition</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}