import PlacesCatalog from "@/components/places-catalog";
import { getPublishedPlaces } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const initialPlaces = await getPublishedPlaces({ limit: 180 });
  const geocodedCount = initialPlaces.filter((p) => p.latitude != null && p.longitude != null).length;

  return (
    <div className="w-full space-y-6">
      <section className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">장소 탐색</h1>
        <p className="mt-2 text-sm text-slate-600">
          대량 데이터 대응을 위해 검색은 서버 최적화 API로 동작합니다. 조건 변경 시 빠르게 재조회됩니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">초기 로드: {initialPlaces.length}</span>
          <span className="chip">좌표 등록: {geocodedCount}</span>
        </div>
      </section>
      <PlacesCatalog places={initialPlaces} />
    </div>
  );
}
