import dynamic from "next/dynamic";
import { getTrails } from "@/lib/api";

const TrailMapPlaceholder = dynamic(
  () =>
    import("@/components/TrailMapPlaceholder").then(
      (mod) => mod.TrailMapPlaceholder
    ),
  {
    ssr: false,
    loading: () => (
      <div className="card p-4">
        <div className="h-[65vh] min-h-[420px] w-full rounded-2xl bg-zinc-900/40" />
      </div>
    ),
  }
);

export default async function MapPage() {
  const trails = await getTrails();

  return (
    <main className="space-y-3 pb-4">
      <section className="card p-6">
        <div className="space-y-1">
          <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
            Map
          </h1>

          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Live trail view
          </p>
        </div>
      </section>

      <TrailMapPlaceholder trails={trails} />
    </main>
  );
}