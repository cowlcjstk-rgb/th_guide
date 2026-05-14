import { Suspense } from "react";
import type { Metadata } from "next";
import PlacesCatalog from "@/components/places-catalog";
import { countBy, inferThaiCity } from "@/lib/geo";
import { getPublishedPlaces } from "@/lib/supabase";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "태국 장소 탐색 | Thailand Guide",
  description: "도시/카테고리 필터로 태국 장소를 빠르게 탐색하세요.",
};

export default async function PlacesPage() {
  const initialPlaces = await getPublishedPlaces({ limit: 160 });
  const citySummary = countBy(initialPlaces, (p) => inferThaiCity(p)).slice(0, 6);
  const categorySummary = countBy(initialPlaces, (p) => p.category ?? "General").slice(0, 6);

  return (
    <div className="w-full space-y-6">
      <section className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">장소 탐색</h1>
        <p className="mt-2 text-sm text-slate-600">
          대량 데이터 대응을 위해 검색은 서버 최적화 API로 동작합니다. 조건 변경 시 빠르게 재조회됩니다.
        </p>
        <div className="mt-4 grid gap-2">
          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">카테고리별 등록 현황:</span>
            {categorySummary.map(([name, count]) => (
              <span key={name} className="chip">
                {name}: {count}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">지역별 등록 현황:</span>
            {citySummary.map(([name, count]) => (
              <span key={name} className="chip">
                {name}: {count}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="panel p-4 text-sm text-slate-500">Loading places...</div>}>
        <PlacesCatalog places={initialPlaces} />
      </Suspense>
    </div>
  );
}
