import { getTrails } from "@/lib/api";
import { MapPageClient } from "./MapPageClient";

export default async function MapPage() {
  const trails = await getTrails();

  return <MapPageClient trails={trails} />;
}