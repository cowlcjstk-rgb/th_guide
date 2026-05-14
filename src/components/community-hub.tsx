"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { CommunityContent, CommunitySection, Place, PlaceReview, TripPlan } from "@/lib/types";

type RatedPlace = {
  place: Place;
  avg: number;
  count: number;
};

type Section = "home" | CommunitySection;

type Props = {
  places: Place[];
  reviews: PlaceReview[];
  plans: TripPlan[];
  contents: CommunityContent[];
  section?: Section;
};

export default function CommunityHub({
  places,
  reviews,
  plans,
  contents,
  section = "home",
}: Props) {
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");
  const [reviewList, setReviewList] = useState(reviews);
  const [planList, setPlanList] = useState(plans);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewPlaceId, setReviewPlaceId] = useState(places[0]?.id ?? "");
  const [reviewNickname, setReviewNickname] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPending, setReviewPending] = useState(false);

  const [routeOpen, setRouteOpen] = useState(false);
  const [routeTitle, setRouteTitle] = useState("");
  const [routeDescription, setRouteDescription] = useState("");
  const [routeExtra, setRouteExtra] = useState("");
  const [routeNickname, setRouteNickname] = useState("");
  const [routeKeyword, setRouteKeyword] = useState("");
  const [routeSelected, setRouteSelected] = useState<string[]>([]);
  const [routePending, setRoutePending] = useState(false);

  const t =
    lang === "ko"
      ? {
          title: "커뮤니티",
          subtitle: "실제 방문 리뷰와 동선 공유로 신뢰도 높은 태국 여행 정보를 함께 만듭니다.",
          search: "장소명, 리뷰, 작성자 검색",
          topRated: "평점 랭킹",
          latest: "최신 리뷰",
          routeShares: "동선 공유",
          guide: "여행 가이드",
          faq: "자주 묻는 질문",
          goWrite: "리뷰 쓰기",
          goMap: "동선 만들기",
          reviews: "리뷰",
          stats: "커뮤니티 현황",
          totalReviews: "전체 리뷰",
          totalPlans: "공유 동선",
          activePlaces: "리뷰 등록 장소",
          empty: "표시할 데이터가 없습니다.",
          writeTitle: "리뷰 작성",
          routeTitle: "동선 등록",
          place: "장소",
          rating: "별점",
          nickname: "닉네임 (선택)",
          comment: "리뷰 내용",
          submit: "등록",
          close: "닫기",
          submitOkReview: "리뷰 등록이 완료되었습니다.",
          submitOkRoute: "동선 등록 요청이 완료되었습니다. 승인 후 공개됩니다.",
          routeName: "동선 제목",
          routeDesc: "동선 설명",
          routeExtra: "추가 정보",
          routePlaceSearch: "동선 장소 검색",
          routeNeed: "동선은 최소 2개 장소를 선택해 주세요.",
        }
      : {
          title: "Community",
          subtitle: "Build trusted Thailand travel knowledge with real-visit reviews and route sharing.",
          search: "Search place, review, author",
          topRated: "Top Rated",
          latest: "Latest Reviews",
          routeShares: "Route Shares",
          guide: "Travel Guide",
          faq: "FAQ",
          goWrite: "Write Review",
          goMap: "Create Route",
          reviews: "reviews",
          stats: "Community Stats",
          totalReviews: "Total Reviews",
          totalPlans: "Shared Routes",
          activePlaces: "Places with Reviews",
          empty: "No data yet.",
          writeTitle: "Write Review",
          routeTitle: "Route Registration",
          place: "Place",
          rating: "Rating",
          nickname: "Nickname (optional)",
          comment: "Comment",
          submit: "Submit",
          close: "Close",
          submitOkReview: "Review submitted.",
          submitOkRoute: "Route submitted. It will be shown after approval.",
          routeName: "Route title",
          routeDesc: "Route description",
          routeExtra: "Extra info",
          routePlaceSearch: "Search route places",
          routeNeed: "Please select at least 2 places.",
        };

  const placeMap = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const topRated = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of reviewList) {
      const current = map.get(r.place_id) ?? { sum: 0, count: 0 };
      current.sum += Number(r.rating);
      current.count += 1;
      map.set(r.place_id, current);
    }
    return Array.from(map.entries())
      .map(([id, value]) => {
        const place = placeMap.get(id);
        if (!place) return null;
        return { place, avg: value.sum / value.count, count: value.count } satisfies RatedPlace;
      })
      .filter(Boolean)
      .sort((a, b) => (b as RatedPlace).avg - (a as RatedPlace).avg) as RatedPlace[];
  }, [reviewList, placeMap]);

  const filteredReviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reviewList;
    return reviewList.filter((r) => {
      const place = placeMap.get(r.place_id);
      return (
        (place?.name ?? "").toLowerCase().includes(q) ||
        (r.comment ?? "").toLowerCase().includes(q) ||
        (r.nickname ?? "").toLowerCase().includes(q)
      );
    });
  }, [reviewList, placeMap, query]);

  const filteredRoutePlaces = useMemo(() => {
    const q = routeKeyword.trim().toLowerCase();
    if (!q) return places;
    return places.filter((p) => p.name.toLowerCase().includes(q) || (p.district ?? "").toLowerCase().includes(q));
  }, [places, routeKeyword]);

  const reviewedPlaceCount = useMemo(() => new Set(reviewList.map((r) => r.place_id)).size, [reviewList]);

  const contentsBySection = useMemo(() => {
    const map = new Map<CommunitySection, CommunityContent[]>();
    for (const item of contents) {
      const current = map.get(item.section) ?? [];
      current.push(item);
      map.set(item.section, current);
    }
    return map;
  }, [contents]);

  const renderManagedContent = (sectionName: CommunitySection) => {
    const list = contentsBySection.get(sectionName) ?? [];
    if (!list.length) return null;
    return (
      <div className="mt-3 space-y-2">
        {list.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-800">
              {lang === "ko" ? item.title_ko : item.title_en}
            </p>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
              {lang === "ko" ? item.body_ko : item.body_en}
            </p>
          </article>
        ))}
      </div>
    );
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewPlaceId) return;
    setReviewPending(true);
    const res = await fetch("/api/community/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place_id: reviewPlaceId,
        nickname: reviewNickname,
        rating: reviewRating,
        comment: reviewComment,
      }),
    });
    const data = await res.json();
    setReviewPending(false);
    if (!res.ok || !data?.review) return;
    setReviewList((prev) => [data.review, ...prev]);
    setReviewOpen(false);
    setReviewNickname("");
    setReviewComment("");
    alert(t.submitOkReview);
  };

  const toggleRoutePlace = (placeId: string) => {
    setRouteSelected((prev) => (prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]));
  };

  const submitRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (routeSelected.length < 2) {
      alert(t.routeNeed);
      return;
    }
    setRoutePending(true);
    const res = await fetch("/api/trip-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: routeTitle,
        description: routeDescription,
        extra_info: routeExtra,
        submitted_by: routeNickname,
        place_ids: routeSelected,
      }),
    });
    const data = await res.json();
    setRoutePending(false);
    if (!res.ok || !data?.plan) return;
    setPlanList((prev) => [data.plan, ...prev]);
    setRouteOpen(false);
    setRouteTitle("");
    setRouteDescription("");
    setRouteExtra("");
    setRouteNickname("");
    setRouteKeyword("");
    setRouteSelected([]);
    alert(t.submitOkRoute);
  };

  const topRatedSection = (
    <section className="card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.topRated}</h2>
      {renderManagedContent("top-rated")}
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {topRated.slice(0, 20).map((item) => (
          <Link key={item.place.id} href={`/place/${item.place.slug}`} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-800">{item.place.name}</p>
            <p className="mt-1 text-xs text-slate-500">{item.avg.toFixed(1)} / 5 · {item.count} {t.reviews}</p>
          </Link>
        ))}
      </div>
      {topRated.length === 0 ? <p className="mt-3 text-sm text-slate-500">{t.empty}</p> : null}
    </section>
  );

  const latestSection = (
    <section className="card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.latest}</h2>
      {renderManagedContent("latest-reviews")}
      <div className="mt-3 space-y-2">
        {filteredReviews.slice(0, 40).map((r) => {
          const place = placeMap.get(r.place_id);
          return (
            <article key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-800">{r.nickname || "Guest"} · {"★".repeat(Number(r.rating))}</p>
              <p className="mt-1 text-xs text-slate-500">{place ? <Link href={`/place/${place.slug}`}>{place.name}</Link> : "Unknown place"}</p>
              <p className="mt-2 text-sm text-slate-700">{r.comment || "-"}</p>
            </article>
          );
        })}
      </div>
      {filteredReviews.length === 0 ? <p className="mt-3 text-sm text-slate-500">{t.empty}</p> : null}
    </section>
  );

  const routeShareSection = (
    <section className="card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.routeShares}</h2>
      {renderManagedContent("route-shares")}
      <div className="mt-3 space-y-2">
        {planList.slice(0, 24).map((plan) => (
          <Link
            key={plan.id}
            href={`/map?plan=${encodeURIComponent((plan.place_ids || []).join(","))}&planId=${plan.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-3"
          >
            <p className="text-sm font-semibold text-slate-800">{plan.title || `Plan ${plan.id.slice(0, 6)}`}</p>
            <p className="mt-1 text-xs text-slate-500">{(plan.place_ids || []).length} stops · {new Date(plan.created_at).toLocaleDateString()}</p>
            {plan.description ? <p className="mt-2 text-sm text-slate-700">{plan.description}</p> : null}
          </Link>
        ))}
      </div>
      {planList.length === 0 ? <p className="mt-3 text-sm text-slate-500">{t.empty}</p> : null}
    </section>
  );

  const guideSection = (
    <section className="card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.guide}</h2>
      {renderManagedContent("guide")}
    </section>
  );

  const faqSection = (
    <section className="card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.faq}</h2>
      {renderManagedContent("faq")}
    </section>
  );

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setReviewOpen(true)}>{t.goWrite}</button>
            <button className="btn-primary" onClick={() => setRouteOpen(true)}>{t.goMap}</button>
          </div>
        </div>
        {(section === "home" || section === "latest-reviews") && (
          <input className="input mt-4" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
      </header>

      {section === "home" ? (
        <section className="panel p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.stats}</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="card p-4"><p className="text-xs text-slate-500">{t.totalReviews}</p><p className="mt-1 text-2xl font-semibold">{reviewList.length}</p></div>
            <div className="card p-4"><p className="text-xs text-slate-500">{t.totalPlans}</p><p className="mt-1 text-2xl font-semibold">{planList.length}</p></div>
            <div className="card p-4"><p className="text-xs text-slate-500">{t.activePlaces}</p><p className="mt-1 text-2xl font-semibold">{reviewedPlaceCount}</p></div>
          </div>
        </section>
      ) : null}

      {(section === "home" || section === "top-rated") && topRatedSection}
      {(section === "home" || section === "latest-reviews") && latestSection}
      {(section === "home" || section === "route-shares") && routeShareSection}
      {(section === "home" || section === "guide") && guideSection}
      {(section === "home" || section === "faq") && faqSection}

      {reviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <form onSubmit={submitReview} className="panel w-full max-w-lg space-y-3 p-5">
            <h3 className="text-lg font-semibold">{t.writeTitle}</h3>
            <select className="input" value={reviewPlaceId} onChange={(e) => setReviewPlaceId(e.target.value)} required>
              {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="input" value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{t.rating}: {"★".repeat(n)}</option>)}
            </select>
            <input className="input" placeholder={t.nickname} value={reviewNickname} onChange={(e) => setReviewNickname(e.target.value)} />
            <textarea className="input min-h-24" placeholder={t.comment} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" onClick={() => setReviewOpen(false)}>{t.close}</button>
              <button type="submit" className="btn-primary" disabled={reviewPending}>{reviewPending ? "..." : t.submit}</button>
            </div>
          </form>
        </div>
      ) : null}

      {routeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <form onSubmit={submitRoute} className="panel w-full max-w-2xl space-y-3 p-5">
            <h3 className="text-lg font-semibold">{t.routeTitle}</h3>
            <input className="input" placeholder={t.routeName} value={routeTitle} onChange={(e) => setRouteTitle(e.target.value)} required />
            <textarea className="input min-h-20" placeholder={t.routeDesc} value={routeDescription} onChange={(e) => setRouteDescription(e.target.value)} />
            <textarea className="input min-h-20" placeholder={t.routeExtra} value={routeExtra} onChange={(e) => setRouteExtra(e.target.value)} />
            <input className="input" placeholder={t.nickname} value={routeNickname} onChange={(e) => setRouteNickname(e.target.value)} />
            <input className="input" placeholder={t.routePlaceSearch} value={routeKeyword} onChange={(e) => setRouteKeyword(e.target.value)} />
            <div className="max-h-56 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3">
              {filteredRoutePlaces.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={routeSelected.includes(p.id)} onChange={() => toggleRoutePlace(p.id)} />
                  {p.name} ({p.district ?? "Unknown"})
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" onClick={() => setRouteOpen(false)}>{t.close}</button>
              <button type="submit" className="btn-primary" disabled={routePending}>{routePending ? "..." : t.submit}</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

