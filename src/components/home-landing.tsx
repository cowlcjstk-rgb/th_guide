"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PlaceCard from "@/components/place-card";
import { countBy, inferThaiCity } from "@/lib/geo";
import { toFilterSlug } from "@/lib/places-seo";
import type { HomeRecentReview } from "@/lib/supabase";
import { Place, TripPlan } from "@/lib/types";

type Props = {
  places: Place[];
  featured: Place[];
  latest: Place[];
  topRoutes: TripPlan[];
  popularPlaces: Place[];
  totalRouteCount: number;
  recentReviews: HomeRecentReview[];
};

const FIRST_VISIT_KEY = "tg_first_visit_seen";
const CITY_TABS = ["Bangkok", "Pattaya", "Chiang Mai"];

export default function HomeLanding({
  places,
  featured,
  latest,
  topRoutes,
  popularPlaces,
  totalRouteCount,
  recentReviews,
}: Props) {
  const [latestOpen, setLatestOpen] = useState(true);
  const [latestLimit, setLatestLimit] = useState(6);
  const [showStarter, setShowStarter] = useState(false);
  const [cityTab, setCityTab] = useState("Bangkok");
  const [reviewOffset, setReviewOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(FIRST_VISIT_KEY);
    if (!seen) {
      setShowStarter(true);
      localStorage.setItem(FIRST_VISIT_KEY, "1");
    }
  }, []);

  useEffect(() => {
    if (recentReviews.length <= 5) return;
    const timer = setInterval(() => {
      setReviewOffset((prev) => (prev + 1) % recentReviews.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [recentReviews.length]);

  const placeMap = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const cityStats = useMemo(() => countBy(places, (p) => inferThaiCity(p)).slice(0, 6), [places]);
  const categoryStats = useMemo(() => countBy(places, (p) => p.category ?? "General").slice(0, 6), [places]);
  const topCities = cityStats.slice(0, 4);
  const topCategories = categoryStats.slice(0, 6);

  const shownLatest = latest.slice(0, latestLimit);
  const canLoadMore = latestLimit < latest.length;
  const verifiedCount = places.filter((place) => Boolean(place.last_verified_at)).length;

  const featuredRoute = topRoutes[0] ?? null;
  const featuredRouteStops = useMemo(() => {
    if (!featuredRoute) return [];
    return (featuredRoute.place_ids || []).map((id) => placeMap.get(id)).filter(Boolean) as Place[];
  }, [featuredRoute, placeMap]);

  const featuredRouteImage =
    featuredRouteStops.find((p) => p.thumbnail)?.thumbnail ||
    popularPlaces.find((p) => p.thumbnail)?.thumbnail ||
    null;

  const featuredRoutePoints = [
    featuredRoute ? `${featuredRoute.place_ids.length}개 장소 연결` : "코스 미선택",
    featuredRoute ? `작성자 ${featuredRoute.submitted_by || "커뮤니티"}` : "커뮤니티 공유",
    featuredRoute ? `업데이트 ${new Date(featuredRoute.created_at).toLocaleDateString("ko-KR")}` : "실사용 동선",
  ];

  const curatedByCity = useMemo(() => {
    const result = new Map<string, Place[]>();
    for (const city of CITY_TABS) {
      const rows = places
        .filter((place) => inferThaiCity(place) === city)
        .sort((a, b) => {
          const scoreA = Number(Boolean(a.is_featured)) * 10 + Number(Boolean(a.last_verified_at));
          const scoreB = Number(Boolean(b.is_featured)) * 10 + Number(Boolean(b.last_verified_at));
          if (scoreB !== scoreA) return scoreB - scoreA;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 6);
      result.set(city, rows);
    }
    return result;
  }, [places]);

  useEffect(() => {
    const hasCurrent = (curatedByCity.get(cityTab) ?? []).length > 0;
    if (hasCurrent) return;
    const fallback = CITY_TABS.find((city) => (curatedByCity.get(city) ?? []).length > 0) ?? "Bangkok";
    setCityTab(fallback);
  }, [cityTab, curatedByCity]);

  const cityTabItems = curatedByCity.get(cityTab) ?? [];

  const rollingReviews = useMemo(() => {
    if (recentReviews.length <= 5) return recentReviews;
    return Array.from({ length: 5 }, (_, idx) => recentReviews[(reviewOffset + idx) % recentReviews.length]);
  }, [recentReviews, reviewOffset]);

  return (
    <section className="w-full space-y-6">
      {showStarter ? (
        <section className="panel p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="hero-badge">처음 오셨다면</p>
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

      <section className="panel relative overflow-hidden p-5 md:p-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,#eaf1ff_0,transparent_42%),radial-gradient(circle_at_bottom_left,#eef4ff_0,transparent_36%)]" />
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
          <div>
            <p className="hero-badge">Thailand Traveler Community</p>
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
                <p className="mt-1 text-xl font-semibold text-slate-900">{totalRouteCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">이번 주 추천 동선</p>
            {featuredRoute ? (
              <>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                  {featuredRouteImage ? (
                    <img src={featuredRouteImage} alt={featuredRoute.title ?? "추천 동선"} className="h-40 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-40 w-full bg-[linear-gradient(135deg,#dbeafe,#fde68a)]" />
                  )}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{featuredRoute.title ?? "추천 동선"}</h3>
                {featuredRoute.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{featuredRoute.description}</p>
                ) : null}
                <div className="mt-3 grid gap-2">
                  {featuredRoutePoints.map((point) => (
                    <p key={point} className="accent-note px-3 py-2 text-xs">
                      {point}
                    </p>
                  ))}
                </div>
                {featuredRouteStops.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {featuredRouteStops.slice(0, 5).map((place) => (
                      <span key={place.id} className="chip">{place.name}</span>
                    ))}
                  </div>
                ) : null}
                <Link
                  href={`/map?plan=${encodeURIComponent((featuredRoute.place_ids || []).join(","))}&planId=${featuredRoute.id}`}
                  className="btn-primary mt-4 w-full"
                >
                  이 동선 바로 보기
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">추천 동선 데이터가 준비 중입니다.</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">실시간 커뮤니티 활동</h2>
          <Link href="/community/latest-reviews" className="text-xs text-slate-500 hover:text-slate-900">리뷰 전체 보기</Link>
        </div>
        <div className="mt-3 grid gap-2">
          {rollingReviews.slice(0, 5).map((review) => (
            <div key={review.id} className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold">{review.nickname}</span>
              <span className="mx-1 text-slate-400">·</span>
              <span>{"★".repeat(Math.max(1, Math.min(5, Number(review.rating) || 0)))}</span>
              <span className="mx-1 text-slate-400">·</span>
              {review.place_slug ? (
                <Link href={`/place/${review.place_slug}`} className="font-medium text-slate-800 hover:underline">
                  {review.place_name}
                </Link>
              ) : (
                <span className="font-medium text-slate-800">{review.place_name}</span>
              )}
              {review.comment ? (
                <p className="mt-1 line-clamp-1 text-xs text-slate-600">{review.comment}</p>
              ) : null}
            </div>
          ))}
          {rollingReviews.length === 0 ? (
            <p className="text-sm text-slate-500">아직 등록된 리뷰가 없습니다.</p>
          ) : null}
        </div>
      </section>

      <section className="panel p-5 md:p-6">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">도시별 큐레이션</h2>
          <Link href="/places" className="text-sm text-slate-500 hover:text-slate-900">전체 보기</Link>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {CITY_TABS.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setCityTab(city)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                cityTab === city
                  ? "border-blue-200 bg-blue-50 text-blue-900"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
        {cityTabItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cityTabItems.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">선택한 도시의 큐레이션 장소가 아직 없습니다.</p>
        )}
      </section>

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
              <Link key={plan.id} href={`/map?plan=${plan.place_ids.join(",")}&planId=${plan.id}`} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">{plan.title ?? "추천 동선"}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {plan.place_ids.length}개 장소 · {plan.submitted_by || "커뮤니티"} · {new Date(plan.created_at).toLocaleDateString("ko-KR")}
                </p>
                {plan.description ? <p className="mt-1 line-clamp-1 text-xs text-slate-500">{plan.description}</p> : null}
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
