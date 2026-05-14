"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PlaceCard from "@/components/place-card";
import { countBy, inferThaiCity } from "@/lib/geo";
import { toFilterSlug } from "@/lib/places-seo";
import { Place, TripPlan } from "@/lib/types";

type Props = {
  places: Place[];
  featured: Place[];
  latest: Place[];
  topRoutes: TripPlan[];
  popularPlaces: Place[];
};

const FIRST_VISIT_KEY = "tg_first_visit_seen";

export default function HomeLanding({ places, featured, latest, topRoutes, popularPlaces }: Props) {
  const [latestOpen, setLatestOpen] = useState(true);
  const [latestLimit, setLatestLimit] = useState(6);
  const [showStarter, setShowStarter] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(FIRST_VISIT_KEY);
    if (!seen) {
      setShowStarter(true);
      localStorage.setItem(FIRST_VISIT_KEY, "1");
    }
  }, []);

  const cityStats = useMemo(() => countBy(places, (p) => inferThaiCity(p)).slice(0, 6), [places]);
  const categoryStats = useMemo(() => countBy(places, (p) => p.category ?? "General").slice(0, 6), [places]);
  const topCities = cityStats.slice(0, 4);
  const topCategories = categoryStats.slice(0, 6);

  const shownLatest = latest.slice(0, latestLimit);
  const canLoadMore = latestLimit < latest.length;
  const verifiedCount = places.filter((place) => Boolean(place.last_verified_at)).length;

  return (
    <section className="w-full space-y-6">
      {showStarter ? (
        <section className="panel p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="chip">처음 오셨다면</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">도시를 먼저 선택하고 시작해보세요</h2>
              <p className="mt-1 text-sm text-slate-600">방콕, 파타야, 치앙마이 기준으로 바로 필터된 탐색 페이지로 이동합니다.</p>
            </div>
            <button className="btn-secondary" onClick={() => setShowStarter(false)}>닫기</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "방콕", city: "Bangkok" },
              { label: "파타야", city: "Pattaya" },
              { label: "치앙마이", city: "Chiang Mai" },
            ].map((item) => (
              <Link key={item.city} href={`/places?city=${encodeURIComponent(item.city)}`} className="btn-primary">
                {item.label} 탐색 시작
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="panel relative overflow-hidden p-5 md:p-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,#dbeafe_0,transparent_38%),radial-gradient(circle_at_bottom_left,#cffafe_0,transparent_35%)]" />
        <div className="max-w-3xl">
          <p className="chip">Thailand Traveler Community</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
            태국 여행자 커뮤니티
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600 md:text-base">
            검증된 장소, 커뮤니티 리뷰, 실제 이동 동선까지 한 번에 확인하세요.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/places" className="btn-primary">장소 탐색</Link>
            <Link href="/map" className="btn-secondary">지도 플래너</Link>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/90 bg-white/85 p-3">
              <p className="text-[11px] text-slate-500">전체 장소</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{places.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white/85 p-3">
              <p className="text-[11px] text-slate-500">검증 완료</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{verifiedCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white/85 p-3">
              <p className="text-[11px] text-slate-500">공유 동선</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{topRoutes.length}</p>
            </div>
          </div>
        </div>
      </div>

      {popularPlaces.length > 0 ? (
        <section className="panel p-5 md:p-6">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold tracking-tight">오늘 인기 장소</h2>
            <Link href="/places" className="text-sm text-slate-500 hover:text-slate-900">전체 보기</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel p-5 md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">등록 현황</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs text-slate-500">전체 장소</p>
            <p className="mt-1 text-3xl font-semibold">{places.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">도시별 등록 수</p>
            <div className="mt-2 grid gap-1 text-sm text-slate-700">
              {cityStats.map(([name, count]) => (
                <p key={name}>{name}: {count}</p>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">카테고리별 등록 수</p>
            <div className="mt-2 grid gap-1 text-sm text-slate-700">
              {categoryStats.map(([name, count]) => (
                <p key={name}>{name}: {count}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-5 md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">빠른 탐색</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">도시별 바로가기</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {topCities.map(([city]) => (
                <Link key={city} href={`/places/city/${toFilterSlug(city)}`} className="chip">{city}</Link>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">카테고리 바로가기</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {topCategories.map(([category]) => (
                <Link key={category} href={`/places?category=${encodeURIComponent(category)}`} className="chip">{category}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-5 md:p-6">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">이번 주 인기 동선 TOP5</h2>
          <Link href="/map" className="text-xs text-slate-500 hover:text-slate-900">전체 보기</Link>
        </div>
        {topRoutes.length > 0 ? (
          <div className="grid gap-2">
            {topRoutes.map((plan) => (
              <Link key={plan.id} href={`/map?plan=${plan.place_ids.join(",")}`} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">{plan.title ?? "추천 동선"}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {plan.place_ids.length}개 장소 · {new Date(plan.created_at).toLocaleDateString("ko-KR")}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">아직 공개된 동선이 없습니다.</p>
        )}
      </section>

      {featured.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold tracking-tight">추천 장소</h2>
            <Link href="/places" className="text-sm text-slate-500 hover:text-slate-900">전체 보기</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel p-5 md:p-6">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">최신 등록</h2>
          <button className="text-sm text-slate-500 hover:text-slate-900" onClick={() => setLatestOpen((v) => !v)}>
            {latestOpen ? "접기" : "펼치기"}
          </button>
        </div>
        {latestOpen ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {shownLatest.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
            {canLoadMore ? (
              <button className="btn-secondary mt-4" onClick={() => setLatestLimit((n) => Math.min(n + 8, latest.length))}>
                더 불러오기
              </button>
            ) : null}
          </>
        ) : null}
      </section>
    </section>
  );
}
