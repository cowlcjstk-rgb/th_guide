"use client";

import { useMemo, useState } from "react";
import MapView from "@/components/map-view";
import { useLanguage } from "@/components/language-provider";
import { localizePlaceName } from "@/lib/localize";
import { Place } from "@/lib/types";
import { uniqueValues } from "@/lib/utils";

export default function MapPlanner({ places }: { places: Place[] }) {
  const { lang } = useLanguage();
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const url = new URL(window.location.href);
    const plan = url.searchParams.get("plan");
    if (plan) return plan.split(",").filter(Boolean);
    const saved = localStorage.getItem("trip_plan_latest");
    if (!saved) return [];
    try {
      const ids = JSON.parse(saved);
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  });
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("all");
  const [category, setCategory] = useState("all");
  const [copied, setCopied] = useState(false);

  const districts = useMemo(() => uniqueValues(places.map((p) => p.district)), [places]);
  const categories = useMemo(() => uniqueValues(places.map((p) => p.category)), [places]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return places.filter((p) => {
      const name = localizePlaceName(p, lang).toLowerCase();
      const matchesQuery =
        !q ||
        name.includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.district ?? "").toLowerCase().includes(q);
      const matchesDistrict = district === "all" || p.district === district;
      const matchesCategory = category === "all" || p.category === category;
      return matchesQuery && matchesDistrict && matchesCategory;
    });
  }, [places, keyword, lang, district, category]);

  const selectedPlaces = useMemo(() => {
    const order = new Map(selectedIds.map((id, index) => [id, index]));
    return places
      .filter((p) => selectedIds.includes(p.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [places, selectedIds]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const savePlan = () => {
    localStorage.setItem("trip_plan_latest", JSON.stringify(selectedIds));
  };

  const copyShareLink = async () => {
    if (selectedIds.length < 2) return;
    const res = await fetch("/api/trip-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_ids: selectedIds }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const planId = data?.plan?.id;
    if (!planId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("plan", selectedIds.join(","));
    url.searchParams.set("planId", planId);
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
      <MapView places={places} selectedIds={selectedIds} />
      <aside className="panel p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {lang === "ko" ? "이동 경로 만들기" : "Build route"}
        </h2>

        <div className="mt-3 grid gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="input"
            placeholder={lang === "ko" ? "장소 검색" : "Search places"}
          />
          <select className="input" value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="all">{lang === "ko" ? "전체 지역" : "All districts"}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">{lang === "ko" ? "전체 카테고리" : "All categories"}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {lang === "ko"
            ? "장소를 여러 개 선택하면 지도에 순서와 연결선이 표시됩니다."
            : "Select multiple places to draw route order on map."}
        </p>

        <div className="mt-3 max-h-[45vh] space-y-2 overflow-auto pr-1">
          {filtered.map((place) => {
            const index = selectedIds.indexOf(place.id);
            return (
              <button
                key={place.id}
                onClick={() => toggle(place.id)}
                className={`w-full rounded-xl border p-3 text-left ${
                  index >= 0 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-sm font-semibold">{localizePlaceName(place, lang)}</p>
                <p className={`mt-1 text-xs ${index >= 0 ? "text-slate-200" : "text-slate-500"}`}>
                  {place.district ?? "Unknown"} · {place.category ?? "General"}
                </p>
                {index >= 0 ? <p className="mt-1 text-xs">#{index + 1}</p> : null}
              </button>
            );
          })}
        </div>

        {selectedPlaces.length > 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {lang === "ko" ? "선택된 경로" : "Selected order"}
            </p>
            <ol className="mt-2 space-y-1 text-sm text-slate-700">
              {selectedPlaces.map((p, i) => (
                <li key={p.id}>
                  {i + 1}. {localizePlaceName(p, lang)}
                </li>
              ))}
            </ol>
            <div className="mt-3 grid gap-2">
              <button className="btn-secondary w-full" onClick={savePlan}>
                {lang === "ko" ? "내 동선 저장" : "Save plan"}
              </button>
              <button className="btn-secondary w-full" onClick={copyShareLink}>
                {copied
                  ? lang === "ko"
                    ? "링크 복사 완료"
                    : "Copied"
                  : lang === "ko"
                    ? "공유 링크 복사"
                    : "Copy share link"}
              </button>
            </div>
            <button className="btn-secondary mt-3 w-full" onClick={() => setSelectedIds([])}>
              {lang === "ko" ? "선택 초기화" : "Clear selection"}
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
