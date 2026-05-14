"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ContactBanners from "@/components/contact-banners";
import { trackClientEvent } from "@/components/analytics-tracker";
import { useLanguage } from "@/components/language-provider";
import { Place } from "@/lib/types";

type SearchResponse = {
  places: Place[];
  page: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
};

export default function PlaceEditRequestPage() {
  const { lang } = useLanguage();
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [googleMapUrl, setGoogleMapUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [tips, setTips] = useState("");
  const [reason, setReason] = useState("");
  const [nickname, setNickname] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URL(window.location.href).searchParams.get("q")?.trim() ?? "";
    if (q && !keyword) setKeyword(q);
  }, [keyword]);

  const t =
    lang === "ko"
      ? {
          title: "장소 수정 요청",
          desc: "기존 장소를 선택하고 수정이 필요한 내용을 요청해 주세요.",
          submit: "수정 요청 등록",
          sending: "등록 중...",
          searchLabel: "기존 장소 검색",
          searchPh: "장소명 또는 태그로 검색",
          searchBtn: "검색",
          selectHint: "검색 결과에서 1개 장소를 선택하세요.",
          selected: "선택 장소",
          noResult: "검색 결과가 없습니다.",
          reason: "수정 사유",
          nickname: "작성자 닉네임 (선택)",
          name: "장소명 수정안",
          city: "도시 수정안",
          category: "카테고리 수정안",
          address: "주소 수정안",
          mapUrl: "Google Maps URL 수정안",
          description: "설명 수정안",
          tags: "태그 수정안 (콤마 구분)",
          tips: "운영 팁 수정안",
          ok: "수정 요청이 접수되었습니다. 관리자 검토 후 반영됩니다.",
          fail: "요청 등록 실패",
        }
      : {
          title: "Place Edit Request",
          desc: "Select an existing place and submit your correction request.",
          submit: "Submit edit request",
          sending: "Submitting...",
          searchLabel: "Search existing place",
          searchPh: "Search by place name or tag",
          searchBtn: "Search",
          selectHint: "Select one place from the results.",
          selected: "Selected place",
          noResult: "No results found.",
          reason: "Reason",
          nickname: "Nickname (optional)",
          name: "Name update",
          city: "City update",
          category: "Category update",
          address: "Address update",
          mapUrl: "Google Maps URL update",
          description: "Description update",
          tags: "Tags update (comma separated)",
          tips: "Tips update",
          ok: "Edit request submitted. It will be reviewed by admin.",
          fail: "Failed to submit request",
        };

  const hasAnyChanges = useMemo(
    () =>
      [name, city, category, address, googleMapUrl, description, tags, tips].some((v) => v.trim().length > 0),
    [name, city, category, address, googleMapUrl, description, tags, tips]
  );

  async function runSearch() {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const params = new URLSearchParams({
      q: keyword.trim(),
      category: "all",
      limit: "30",
      offset: "0",
    });
    const res = await fetch(`/api/places/search?${params.toString()}`);
    const data = (await res.json()) as SearchResponse | { error?: string };
    setSearching(false);
    if (!res.ok) {
      setResult((data as { error?: string })?.error ?? "Search failed");
      return;
    }
    setResults((data as SearchResponse).places ?? []);
  }

  useEffect(() => {
    const q = keyword.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      void runSearch();
    }, 220);
    return () => clearTimeout(timer);
  }, [keyword]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlace || !hasAnyChanges) return;
    setPending(true);
    setResult("");
    trackClientEvent("place_edit_request_submit_start", { page: "/submit/place-edit" });

    const requestedChanges: Record<string, unknown> = {};
    if (name.trim()) requestedChanges.name = name.trim();
    if (city.trim()) requestedChanges.city = city.trim();
    if (category.trim()) requestedChanges.category = category.trim();
    if (address.trim()) requestedChanges.address = address.trim();
    if (googleMapUrl.trim()) requestedChanges.google_map_url = googleMapUrl.trim();
    if (description.trim()) requestedChanges.description = description.trim();
    if (tips.trim()) requestedChanges.tips = tips.trim();
    if (tags.trim()) {
      requestedChanges.tags = tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const res = await fetch("/api/submissions/place-edits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place_id: selectedPlace.id,
        requested_changes: requestedChanges,
        reason,
        submitted_by: nickname,
      }),
    });

    const data = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setResult(`${t.fail}: ${data?.error ?? "unknown error"}`);
      return;
    }

    setName("");
    setCity("");
    setCategory("");
    setAddress("");
    setGoogleMapUrl("");
    setDescription("");
    setTags("");
    setTips("");
    setReason("");
    setNickname("");
    setResult(t.ok);
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.desc}</p>
      </header>

      <section className="panel p-5">
        <p className="mb-2 text-xs text-slate-500">{t.searchLabel}</p>
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input
            className="input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t.searchPh}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              }
            }}
          />
          <button className="btn-secondary" onClick={runSearch} disabled={searching}>
            {searching ? "..." : t.searchBtn}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t.selectHint}</p>

        <div className="mt-3 grid gap-2">
          {results.map((place) => (
            <button
              key={place.id}
              className={`rounded-xl border p-3 text-left ${selectedPlace?.id === place.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-800"}`}
              onClick={() => setSelectedPlace(place)}
            >
              <p className="text-sm font-semibold">{place.name}</p>
              <p className={`mt-1 text-xs ${selectedPlace?.id === place.id ? "text-slate-200" : "text-slate-500"}`}>
                {(place.city ?? "Unknown city")} · {(place.category ?? "General")}
              </p>
            </button>
          ))}
          {!searching && keyword.trim() && results.length === 0 ? <p className="text-sm text-slate-500">{t.noResult}</p> : null}
        </div>
      </section>

      <form onSubmit={onSubmit} className="panel grid gap-3 p-5 md:grid-cols-2">
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <p className="text-xs text-slate-500">{t.selected}</p>
          <p className="mt-1 font-semibold text-slate-900">{selectedPlace ? selectedPlace.name : "-"}</p>
        </div>

        <div>
          <p className="mb-1 text-xs text-slate-500">{t.name}</p>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">{t.city}</p>
          <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">{t.category}</p>
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">{t.address}</p>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.mapUrl}</p>
          <input className="input" value={googleMapUrl} onChange={(e) => setGoogleMapUrl(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.description}</p>
          <textarea className="input min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.tags}</p>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.tips}</p>
          <textarea className="input min-h-20" value={tips} onChange={(e) => setTips(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.reason}</p>
          <textarea className="input min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">{t.nickname}</p>
          <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </div>

        <button type="submit" className="btn-primary md:col-span-2" disabled={pending || !selectedPlace || !hasAnyChanges}>
          {pending ? t.sending : t.submit}
        </button>
      </form>

      {result ? <p className="text-sm text-slate-700">{result}</p> : null}
      <ContactBanners />
    </section>
  );
}
