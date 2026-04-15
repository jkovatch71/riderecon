import { getTrails } from "@/lib/api";
import { TrailsPageClient } from "@/components/TrailsPageClient";

export default async function FavoritesPage() {
  const trails = await getTrails();

  return <TrailsPageClient trails={trails} />;
}