import MapPlanner from "@/components/map-planner";
import { getPublishedPlaces } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const places = await getPublishedPlaces();
  const geocodedCount = places.filter((p) => p.latitude != null && p.longitude != null).length;

  return (
    <section className="w-full space-y-6">
      <div className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Map Explorer</h1>
        <p className="mt-2 text-sm text-slate-600">
          Clean map UX powered by MapLibre + MapTiler. Use navigation and geolocation controls
          on the top-right.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">Total places: {places.length}</span>
          <span className="chip">With coordinates: {geocodedCount}</span>
        </div>
      </div>

      <MapPlanner places={places} />
    </section>
  );
}
