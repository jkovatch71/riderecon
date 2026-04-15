import { getTrails } from "@/lib/api";
import { TrailsPageClient } from "@/components/TrailsPageClient";

export default async function TrailsPage() {
  const trails = await getTrails();

  return <TrailsPageClient trails={trails} />;
}