"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { Place, PlaceReview, TripPlan } from "@/lib/types";

type RatedPlace = {
  place: Place;
  avg: number;
  count: number;
};

type Props = {
  places: Place[];
  reviews: PlaceReview[];
  plans: TripPlan[];
};

export default function CommunityHub({ places, reviews, plans }: Props) {
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");

  const t =
    lang === "ko"
      ? {
          title: "커뮤니티",
          subtitle: "실제 방문 리뷰와 동선 공유로, 더 정확한 태국 여행 정보를 함께 만듭니다.",
          search: "장소명/리뷰 검색",
          topRated: "평점 랭킹",
          latest: "최신 리뷰",
          routeShares: "동선 공유",
          guide: "커뮤니티 가이드",
          faq: "자주 묻는 질문",
          goWrite: "리뷰 쓰기",
          goMap: "동선 만들기",
          reviews: "리뷰",
          stats: "커뮤니티 현황",
          totalReviews: "전체 리뷰",
          totalPlans: "공유 동선",
          activePlaces: "리뷰 있는 장소",
        }
      : {
          title: "Community",
          subtitle: "Share real visit reviews and route plans for better Thailand travel decisions.",
          search: "Search place or review",
          topRated: "Top Rated",
          latest: "Latest Reviews",
          routeShares: "Route Shares",
          guide: "Community Guide",
          faq: "FAQ",
          goWrite: "Write review",
          goMap: "Build route",
          reviews: "reviews",
          stats: "Community stats",
          totalReviews: "Total reviews",
          totalPlans: "Shared routes",
          activePlaces: "Places with reviews",
        };

  const placeMap = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const topRated = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of reviews) {
      const cur = map.get(r.place_id) ?? { sum: 0, count: 0 };
      cur.sum += Number(r.rating);
      cur.count += 1;
      map.set(r.place_id, cur);
    }
    return Array.from(map.entries())
      .map(([id, v]) => {
        const place = placeMap.get(id);
        if (!place) return null;
        return { place, avg: v.sum / v.count, count: v.count } satisfies RatedPlace;
      })
      .filter(Boolean)
      .sort((a, b) => (b as RatedPlace).avg - (a as RatedPlace).avg) as RatedPlace[];
  }, [reviews, placeMap]);

  const filteredReviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((r) => {
      const place = placeMap.get(r.place_id);
      return (
        (place?.name ?? "").toLowerCase().includes(q) ||
        (r.comment ?? "").toLowerCase().includes(q) ||
        (r.nickname ?? "").toLowerCase().includes(q)
      );
    });
  }, [reviews, placeMap, query]);

  const reviewedPlaceCount = useMemo(() => new Set(reviews.map((r) => r.place_id)).size, [reviews]);

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/places" className="btn-secondary">
              {t.goWrite}
            </Link>
            <Link href="/map" className="btn-primary">
              {t.goMap}
            </Link>
          </div>
        </div>
        <input
          className="input mt-4"
          placeholder={t.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.stats}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs text-slate-500">{t.totalReviews}</p>
            <p className="mt-1 text-2xl font-semibold">{reviews.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">{t.totalPlans}</p>
            <p className="mt-1 text-2xl font-semibold">{plans.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">{t.activePlaces}</p>
            <p className="mt-1 text-2xl font-semibold">{reviewedPlaceCount}</p>
          </div>
        </div>
      </section>

      <section id="top-rated" className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.topRated}</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {topRated.slice(0, 10).map((item) => (
            <Link
              key={item.place.id}
              href={`/place/${item.place.slug}`}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <p className="text-sm font-semibold text-slate-800">{item.place.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.avg.toFixed(1)} / 5 · {item.count} {t.reviews}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section id="latest-reviews" className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.latest}</h2>
        <div className="mt-3 space-y-2">
          {filteredReviews.slice(0, 20).map((r) => {
            const place = placeMap.get(r.place_id);
            return (
              <article key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-800">
                  {r.nickname || "Guest"} · {"★".repeat(Number(r.rating))}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {place ? <Link href={`/place/${place.slug}`}>{place.name}</Link> : "Unknown place"}
                </p>
                <p className="mt-2 text-sm text-slate-700">{r.comment || "No comment"}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="route-shares" className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.routeShares}</h2>
        <div className="mt-3 space-y-2">
          {plans.slice(0, 12).map((plan) => (
            <Link
              key={plan.id}
              href={`/map?plan=${encodeURIComponent((plan.place_ids || []).join(","))}&planId=${plan.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-3"
            >
              <p className="text-sm font-semibold text-slate-800">
                {plan.title || `Plan ${plan.id.slice(0, 6)}`}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {(plan.place_ids || []).length} stops · {new Date(plan.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section id="guide" className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.guide}</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-700">
          <p>1. 실제 방문한 장소만 리뷰해 주세요.</p>
          <p>2. 별점은 경험 기준으로 솔직하게 남겨 주세요.</p>
          <p>3. 동선 공유 시 이동 수단/시간대를 함께 적으면 도움이 됩니다.</p>
        </div>
      </section>

      <section id="faq" className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.faq}</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p>Q. 리뷰는 회원만 작성할 수 있나요? A. 현재는 닉네임 기반으로 작성 가능합니다.</p>
          <p>Q. 동선 공유는 어디서 하나요? A. 지도 플래너에서 장소 선택 후 공유 링크를 복사하세요.</p>
        </div>
      </section>
    </section>
  );
}
