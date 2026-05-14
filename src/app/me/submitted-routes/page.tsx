"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Place, TripPlan } from "@/lib/types";

type ResponseShape = {
  places?: Place[];
  routes?: TripPlan[];
  error?: string;
};

export default function MySubmittedRoutesPage() {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<TripPlan[]>([]);
  const [placeMap, setPlaceMap] = useState<Map<string, Place>>(new Map());
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me/submissions", { cache: "no-store" });
      const data = (await res.json()) as ResponseShape;
      if (!res.ok) {
        setError(data.error || "Failed to load.");
        setLoading(false);
        return;
      }
      const allPlaces = Array.isArray(data.places) ? data.places : [];
      setPlaceMap(new Map(allPlaces.map((place) => [place.id, place])));
      setRoutes(Array.isArray(data.routes) ? data.routes : []);
      setLoading(false);
    })();
  }, []);

  const routeRows = useMemo(
    () =>
      routes.map((plan) => ({
        ...plan,
        placeNames: (plan.place_ids || [])
          .map((id) => placeMap.get(id)?.name)
          .filter((name): name is string => Boolean(name)),
      })),
    [routes, placeMap]
  );

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">내 등록 동선</h1>
        <p className="mt-2 text-sm text-slate-600">내 계정으로 등록한 동선과 승인 상태를 확인할 수 있습니다.</p>
      </header>

      <section className="panel p-5">
        {loading ? <p className="text-sm text-slate-600">Loading...</p> : null}
        {!loading && error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {!loading && !error && routeRows.length === 0 ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>아직 등록한 동선이 없습니다.</p>
            <Link href="/map" className="btn-secondary inline-flex">
              지도 플래너로 이동
            </Link>
          </div>
        ) : null}

        {!loading && !error && routeRows.length > 0 ? (
          <div className="space-y-3">
            {routeRows.map((plan) => (
              <article key={plan.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-base font-semibold text-slate-900">{plan.title || "제목 없는 동선"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  상태: {plan.status || "pending"} · 정류장 {(plan.place_ids || []).length}개 ·{" "}
                  {new Date(plan.created_at).toLocaleDateString("ko-KR")}
                </p>
                {plan.description ? <p className="mt-2 text-sm text-slate-700">{plan.description}</p> : null}
                {plan.placeNames.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {plan.placeNames.slice(0, 12).map((name) => (
                      <span key={`${plan.id}-${name}`} className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-700">
                        {name}
                      </span>
                    ))}
                  </div>
                ) : null}
                <Link
                  href={`/map?plan=${encodeURIComponent((plan.place_ids || []).join(","))}&planId=${plan.id}`}
                  className="btn-secondary mt-3 inline-flex !text-xs"
                >
                  지도에서 보기
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}

