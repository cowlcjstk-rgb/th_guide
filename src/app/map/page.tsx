import MapView from "@/components/map-view";
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

      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <MapView places={places} />
        <aside className="panel p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Quick list
          </h2>
          <div className="mt-3 max-h-[68vh] space-y-2 overflow-auto">
            {places.map((place) => (
              <div key={place.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">{place.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {place.district ?? "Unknown"} · {place.category ?? "General"}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
