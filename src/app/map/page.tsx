import MapView from "@/components/map-view";
import { getPublishedPlaces } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const places = await getPublishedPlaces();

  return (
    <section className="w-full">
      <h1 className="text-2xl font-bold">지도 탐색</h1>
      <p className="mt-2 text-sm text-slate-600">
        MapLibre + OpenStreetMap 기반 무료 지도입니다.
      </p>
      <div className="mt-6">
        <MapView places={places} />
      </div>
    </section>
  );
}
