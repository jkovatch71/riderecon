import Link from "next/link";
import { getTrails } from "@/lib/api";
import { TrailMapPlaceholder } from "@/components/TrailMapPlaceholder";
import { TrailList } from "@/components/TrailList";
import { HomeBriefing } from "@/components/HomeBriefing";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { view?: string; selected?: string };
}) {
  const trails = await getTrails();
  const view = searchParams?.view === "map" ? "map" : "list";
  const selectedTrailId = searchParams?.selected || null;

  return (
    <main className="space-y-6">
      <section className="card p-6">
        <HomeBriefing trails={trails} />

        <div className="mt-4 flex gap-3">
          <Link
            href="/?view=list"
            className={view === "list" ? "btn-primary" : "btn-secondary"}
          >
            Trail list
          </Link>
          <Link
            href="/?view=map"
            className={view === "map" ? "btn-primary" : "btn-secondary"}
          >
            Map view
          </Link>
        </div>
      </section>

      {view === "list" ? (
        <TrailList trails={trails} />
      ) : (
        <TrailMapPlaceholder trails={trails} selectedTrailId={selectedTrailId} />
      )}
    </main>
  );
}