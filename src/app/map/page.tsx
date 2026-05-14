import { Suspense } from "react";
import MapPlanner from "@/components/map-planner";
import { countBy, inferThaiCity } from "@/lib/geo";
import { getPublishedPlaces } from "@/lib/supabase";

export const revalidate = 300;

export default async function MapPage() {
  const places = await getPublishedPlaces({ limit: 500 });
  const geocodedCount = places.filter((p) => p.latitude != null && p.longitude != null).length;
  const citySummary = countBy(places, (p) => inferThaiCity(p)).slice(0, 6);

  return (
    <section className="w-full space-y-6">
      <div className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Thailand Map Planner</h1>
        <p className="mt-2 text-sm text-slate-600">
          Select multiple places, build real road routes, and submit your route for community sharing.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">Total places: {places.length}</span>
          <span className="chip">With coordinates: {geocodedCount}</span>
          {citySummary.map(([city, count]) => (
            <span key={city} className="chip">
              {city}: {count}
            </span>
          ))}
        </div>
      </div>

      <Suspense fallback={<div className="panel p-4 text-sm text-slate-500">Loading map planner...</div>}>
        <MapPlanner places={places} />
      </Suspense>
    </section>
  );
}
