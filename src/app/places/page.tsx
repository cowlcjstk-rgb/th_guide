import PlacesCatalog from "@/components/places-catalog";
import { getPublishedPlaces } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const places = await getPublishedPlaces();
  const geocodedCount = places.filter((p) => p.latitude != null && p.longitude != null).length;

  return (
    <div className="w-full space-y-6">
      <section className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">장소 탐색</h1>
        <p className="mt-2 text-sm text-slate-600">
          지도와 카드로 동시에 확인하면서, 도시/지역/카테고리별로 빠르게 탐색하세요.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">전체 장소: {places.length}</span>
          <span className="chip">좌표 등록: {geocodedCount}</span>
        </div>
      </section>
      <PlacesCatalog places={places} />
    </div>
  );
}
