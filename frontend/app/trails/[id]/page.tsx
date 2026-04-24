import Link from "next/link";
import { getTrail, getTrailReports } from "@/lib/api";
import { TrailDetailClient } from "@/components/TrailDetailClient";

export const dynamic = "force-dynamic";

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
          <h1 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
            Trail not found
          </h1>
          <p className="text-helper mt-2 text-zinc-400">
            The trail you requested could not be found.
          </p>
          <Link href="/trails" className="btn-primary mt-4 inline-block">
            Back to trails
          </Link>
        </div>
      </main>
    );
  }

  return <TrailDetailClient trail={trail} reports={reports} />;
}