import { getTrails } from "@/lib/api";
import { TrailList } from "@/components/TrailList";

export default async function TrailsPage() {
  const trails = await getTrails();

  return (
    <div className="space-y-4">
      <TrailList trails={trails} />
    </div>
  );
}