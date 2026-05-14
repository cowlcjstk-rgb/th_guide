"use client";

import { useEffect, useMemo, useState } from "react";
import { CommunityContent, CommunitySection } from "@/lib/types";

type AdminRoute = {
  id: string;
  title: string | null;
  description: string | null;
  submitted_by: string | null;
  status: string | null;
  place_ids: string[] | null;
  created_at: string;
};

type AdminReview = {
  id: string;
  place_id: string;
  nickname: string;
  rating: number;
  comment: string | null;
  created_at: string;
  places?: { name?: string | null; slug?: string | null } | null;
};

const SECTION_OPTIONS: Array<{ value: CommunitySection; label: string }> = [
  { value: "top-rated", label: "평점 랭킹 / TOP RATED" },
  { value: "latest-reviews", label: "최신 리뷰 / LATEST REVIEWS" },
  { value: "route-shares", label: "동선 공유 / ROUTE SHARES" },
  { value: "guide", label: "여행 가이드 / TRAVEL GUIDE" },
  { value: "faq", label: "자주 묻는 질문 / FAQ" },
];

export default function AdminCommunityPage() {
  const [items, setItems] = useState<CommunityContent[]>([]);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [section, setSection] = useState<CommunitySection>("faq");
  const [titleKo, setTitleKo] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyKo, setBodyKo] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const grouped = useMemo(() => {
    const map = new Map<CommunitySection, CommunityContent[]>();
    for (const item of items) {
      const current = map.get(item.section) ?? [];
      current.push(item);
      map.set(item.section, current);
    }
    return map;
  }, [items]);

  const uniqueReviews = useMemo(() => {
    const seen = new Set<string>();
    const list: AdminReview[] = [];
    for (const review of reviews) {
      const key = `${review.place_id}::${review.nickname}::${review.comment ?? ""}::${review.rating}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(review);
    }
    return list;
  }, [reviews]);

  async function loadAll() {
    setLoading(true);
    setMessage("");
    const [contentsRes, routesRes, reviewsRes] = await Promise.all([
      fetch("/api/admin/community-contents"),
      fetch("/api/admin/community-routes"),
      fetch("/api/admin/community-reviews"),
    ]);

    const contentsData = await contentsRes.json();
    const routesData = await routesRes.json();
    const reviewsData = await reviewsRes.json();
    setLoading(false);

    if (!contentsRes.ok) {
      setMessage(contentsData?.error ?? "커뮤니티 문구를 불러오지 못했습니다.");
      return;
    }
    if (!routesRes.ok) {
      setMessage(routesData?.error ?? "동선 목록을 불러오지 못했습니다.");
      return;
    }
    if (!reviewsRes.ok) {
      setMessage(reviewsData?.error ?? "리뷰 목록을 불러오지 못했습니다.");
      return;
    }

    setItems(contentsData.items ?? []);
    setRoutes(routesData.items ?? []);
    setReviews(reviewsData.items ?? []);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/community-contents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section,
        title_ko: titleKo,
        title_en: titleEn,
        body_ko: bodyKo,
        body_en: bodyEn,
        sort_order: sortOrder,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error ?? "항목 생성에 실패했습니다.");
      return;
    }
    setTitleKo("");
    setTitleEn("");
    setBodyKo("");
    setBodyEn("");
    await loadAll();
  }

  async function deleteContent(id: string) {
    const res = await fetch("/api/admin/community-contents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error ?? "항목 삭제에 실패했습니다.");
      return;
    }
    await loadAll();
  }

  async function deleteRoute(id: string) {
    const res = await fetch("/api/admin/community-routes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error ?? "동선 삭제에 실패했습니다.");
      return;
    }
    await loadAll();
  }

  async function deleteReview(id: string) {
    const res = await fetch("/api/admin/community-reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error ?? "리뷰 삭제에 실패했습니다.");
      return;
    }
    await loadAll();
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">커뮤니티 관리</h1>
        <p className="mt-2 text-sm text-slate-600">
          문구 항목, 공유 동선, 최신 리뷰를 확인하고 삭제할 수 있습니다.
        </p>
      </header>

      <div className="panel p-5">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <p className="text-sm text-slate-600">관리자 계정에서만 조회/수정/삭제가 가능합니다.</p>
          <button className="btn-primary" onClick={loadAll} disabled={loading}>
            {loading ? "Loading..." : "새로고침"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="chip">문구 항목: {items.length}</span>
          <span className="chip">공유 동선: {routes.length}</span>
          <span className="chip">리뷰: {uniqueReviews.length}</span>
        </div>
        {message ? <p className="mt-3 text-sm text-rose-600">{message}</p> : null}
      </div>

      <form onSubmit={createItem} className="panel grid gap-3 p-5 md:grid-cols-2">
        <select className="input" value={section} onChange={(e) => setSection(e.target.value as CommunitySection)}>
          {SECTION_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          placeholder="정렬 순서"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
        <input className="input" placeholder="제목(한글)" value={titleKo} onChange={(e) => setTitleKo(e.target.value)} required />
        <input className="input" placeholder="Title(EN)" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} required />
        <textarea className="input min-h-24 md:col-span-2" placeholder="내용(한글)" value={bodyKo} onChange={(e) => setBodyKo(e.target.value)} />
        <textarea className="input min-h-24 md:col-span-2" placeholder="Content(EN)" value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} />
        <button type="submit" className="btn-primary md:col-span-2">
          항목 생성
        </button>
      </form>

      {SECTION_OPTIONS.map((option) => (
        <section key={option.value} className="panel p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{option.label}</h2>
          <div className="mt-3 space-y-2">
            {(grouped.get(option.value) ?? []).map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold">{item.title_ko} / {item.title_en}</p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{item.body_ko}</p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{item.body_en}</p>
                <div className="mt-2">
                  <button className="btn-secondary" onClick={() => deleteContent(item.id)}>
                    삭제
                  </button>
                </div>
              </article>
            ))}
            {(grouped.get(option.value) ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">등록된 항목이 없습니다.</p>
            ) : null}
          </div>
        </section>
      ))}

      <section className="panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">공유 동선 관리</h2>
        <div className="mt-3 space-y-2">
          {routes.map((route) => (
            <article key={route.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">{route.title || "제목 없음"}</p>
              <p className="mt-1 text-xs text-slate-600">
                {route.status || "unknown"} · {(route.place_ids || []).length} stops · {route.submitted_by || "anonymous"}
              </p>
              {route.description ? <p className="mt-1 text-xs text-slate-600">{route.description}</p> : null}
              <button className="btn-secondary mt-2" onClick={() => deleteRoute(route.id)}>
                삭제
              </button>
            </article>
          ))}
          {routes.length === 0 ? <p className="text-sm text-slate-500">등록된 공유 동선이 없습니다.</p> : null}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">리뷰 관리</h2>
        <div className="mt-3 space-y-2">
          {uniqueReviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">
                {review.nickname} · {"★".repeat(Math.max(1, Math.min(5, Number(review.rating) || 0)))}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {review.places?.name || "Unknown place"} · {new Date(review.created_at).toLocaleDateString("ko-KR")}
              </p>
              <p className="mt-1 text-xs text-slate-600">{review.comment || "-"}</p>
              <button className="btn-secondary mt-2" onClick={() => deleteReview(review.id)}>
                삭제
              </button>
            </article>
          ))}
          {uniqueReviews.length === 0 ? <p className="text-sm text-slate-500">등록된 리뷰가 없습니다.</p> : null}
        </div>
      </section>
    </section>
  );
}
