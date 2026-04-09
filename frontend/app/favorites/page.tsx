import { getTrails } from "@/lib/api";
import { FavoritesManager } from "@/components/FavoritesManager";

export default async function FavoritesPage() {
  const trails = await getTrails();

  return (
    <main className="space-y-6">
      <section className="card p-6">
        <h1 className="text-2xl font-bold">Favorite Trails</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Choose your favorite trails so your homepage and briefing feel more personal.
        </p>
      </section>

      <section className="card p-6">
        <FavoritesManager trails={trails} />
      </section>
    </main>
  );
}