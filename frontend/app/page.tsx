import { getTrails } from "@/lib/api";
import { HomeBriefing } from "@/components/HomeBriefing";
import { YourTrailsPreview } from "@/components/YourTrailsPreview";

export default async function HomePage() {
  const trails = await getTrails();

  return (
    <main className="space-y-3">
      <section className="card p-6">
        <HomeBriefing trails={trails} />
      </section>

      <YourTrailsPreview trails={trails} />
    </main>
  );
}