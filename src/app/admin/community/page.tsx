"use client";

import { useMemo, useState } from "react";
import { CommunityContent, CommunitySection } from "@/lib/types";

const SECTION_OPTIONS: Array<{ value: CommunitySection; label: string }> = [
  { value: "top-rated", label: "평점 랭킹 / Top Rated" },
  { value: "latest-reviews", label: "최신 리뷰 / Latest Reviews" },
  { value: "route-shares", label: "동선 공유 / Route Shares" },
  { value: "guide", label: "여행 가이드 / Travel Guide" },
  { value: "faq", label: "자주 묻는 질문 / FAQ" },
];

export default function AdminCommunityPage() {
  const [items, setItems] = useState<CommunityContent[]>([]);
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

  async function loadItems() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/admin/community-contents", {
      headers: {},
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error ?? "Failed to load");
      return;
    }
    setItems(data.items ?? []);
  }

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/community-contents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
      setMessage(data?.error ?? "Create failed");
      return;
    }
    setTitleKo("");
    setTitleEn("");
    setBodyKo("");
    setBodyEn("");
    await loadItems();
  }

  async function deleteItem(id: string) {
    const res = await fetch("/api/admin/community-contents", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error ?? "Delete failed");
      return;
    }
    await loadItems();
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">커뮤니티 관리</h1>
        <p className="mt-2 text-sm text-slate-600">
          평점 랭킹, 최신 리뷰, 동선 공유, 여행 가이드, FAQ 항목을 생성/삭제합니다.
        </p>
      </header>

      <div className="panel p-5">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <p className="text-sm text-slate-600">관리자 로그인 상태에서만 조회/수정 가능합니다.</p>
          <button className="btn-primary" onClick={loadItems} disabled={loading}>
            {loading ? "Loading..." : "목록 불러오기"}
          </button>
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
          placeholder="정렬 순서 / Sort order"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
        <input className="input" placeholder="제목(한글) 예: 방콕 루프탑 추천" value={titleKo} onChange={(e) => setTitleKo(e.target.value)} required />
        <input className="input" placeholder="Title(EN) e.g. Bangkok Rooftop Picks" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} required />
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
                  <button className="btn-secondary" onClick={() => deleteItem(item.id)}>
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
    </section>
  );
}
