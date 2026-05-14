"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { trackClientEvent } from "@/components/analytics-tracker";
import MapView from "@/components/map-view";
import { useLanguage } from "@/components/language-provider";
import { countBy, inferThaiCity } from "@/lib/geo";
import { localizePlaceName } from "@/lib/localize";
import { buildCategoryColorMap } from "@/lib/map-categories";
import { Place } from "@/lib/types";
import { uniqueValues } from "@/lib/utils";

export default function MapPlanner({ places }: { places: Place[] }) {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const [loadedPlanId, setLoadedPlanId] = useState("");
  const [loadedPlanTitle, setLoadedPlanTitle] = useState("");
  const [loadedPlanDescription, setLoadedPlanDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState("all");
  const [routeMode, setRouteMode] = useState<"driving" | "walking">("driving");
  const [routeSummary, setRouteSummary] = useState<{
    mode: "driving" | "walking";
    distanceM: number;
    durationS: number;
    isFallback: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [submitPending, setSubmitPending] = useState(false);
  const [submitResult, setSubmitResult] = useState("");
  const [routeTitle, setRouteTitle] = useState("");
  const [routeDescription, setRouteDescription] = useState("");
  const [routeExtraInfo, setRouteExtraInfo] = useState("");
  const [routeAuthor, setRouteAuthor] = useState("");
  const [inspectedPlaceId, setInspectedPlaceId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const plan = new URL(window.location.href).searchParams.get("plan");
    if (plan) {
      setSelectedIds(plan.split(",").filter(Boolean));
      return;
    }
    const saved = localStorage.getItem("trip_plan_latest");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setSelectedIds(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("trip_plan_latest", JSON.stringify(selectedIds));
  }, [selectedIds]);

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (!plan) return;
    const ids = plan.split(",").filter(Boolean);
    if (ids.length > 0) setSelectedIds(ids);
    setLoadedPlanId(searchParams.get("planId") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!loadedPlanId) {
      setLoadedPlanTitle("");
      setLoadedPlanDescription("");
      return;
    }
    (async () => {
      const res = await fetch(`/api/trip-plans/${loadedPlanId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.plan) {
        setLoadedPlanTitle("");
        setLoadedPlanDescription("");
        return;
      }
      const nextTitle = String(data.plan.title ?? "");
      const nextDescription = String(data.plan.description ?? "");
      setLoadedPlanTitle(nextTitle);
      setLoadedPlanDescription(nextDescription);
      setRouteTitle((prev) => prev || nextTitle);
      setRouteDescription((prev) => prev || nextDescription);
    })();
  }, [loadedPlanId]);

  const withCity = useMemo(() => places.map((place) => ({ ...place, _city: inferThaiCity(place) })), [places]);

  const cityOptions = useMemo(() => uniqueValues(withCity.map((p) => p._city)), [withCity]);
  const categoryOptions = useMemo(() => uniqueValues(withCity.map((p) => p.category)), [withCity]);
  const categoryColorMap = useMemo(
    () => buildCategoryColorMap(categoryOptions.map((item) => item ?? "General")),
    [categoryOptions]
  );

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return withCity.filter((p) => {
      const cityOk = city === "all" || p._city === city;
      const categoryOk = category === "all" || p.category === category;
      const queryOk =
        !q ||
        localizePlaceName(p, lang).toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        p._city.toLowerCase().includes(q);
      return cityOk && categoryOk && queryOk;
    });
  }, [withCity, keyword, lang, city, category]);

  const selectedPlaces = useMemo(() => {
    const order = new Map(selectedIds.map((id, index) => [id, index]));
    return withCity
      .filter((p) => selectedIds.includes(p.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [withCity, selectedIds]);

  const inspectedPlace = useMemo(() => withCity.find((p) => p.id === inspectedPlaceId) ?? null, [withCity, inspectedPlaceId]);
  const cityStats = useMemo(() => countBy(withCity, (p) => p._city).slice(0, 8), [withCity]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  async function copyShareLink() {
    if (selectedIds.length < 2) return;
    const url = new URL(window.location.href);
    url.searchParams.set("plan", selectedIds.join(","));
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function submitRoute(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length < 2) return;
    trackClientEvent("trip_plan_submit_start", { page: "/map", selected_count: selectedIds.length });
    setSubmitPending(true);
    setSubmitResult("");
    const res = await fetch("/api/trip-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: routeTitle,
        description: routeDescription,
        extra_info: routeExtraInfo,
        submitted_by: routeAuthor,
        place_ids: selectedIds,
      }),
    });
    const data = (await res.json()) as { error?: string };
    setSubmitPending(false);
    if (!res.ok) {
      setSubmitResult(data?.error ?? "등록 실패");
      return;
    }
    setSubmitResult(lang === "ko" ? "동선 등록이 접수되었습니다. 검수 후 공개됩니다." : "Route request submitted.");
    setRouteTitle("");
    setRouteDescription("");
    setRouteExtraInfo("");
    setRouteAuthor("");
    setRegisterOpen(false);
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <div className="space-y-3">
          <MapView
            places={filtered}
            allPlaces={withCity}
            selectedIds={selectedIds}
            routeMode={routeMode}
            onRouteSummaryChange={setRouteSummary}
            onPlaceInspect={setInspectedPlaceId}
          />
        </div>

        <aside className="panel p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {lang === "ko" ? "이동 경로 만들기" : "Build route"}
          </h2>
          {loadedPlanId ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
              <p className="font-semibold">{lang === "ko" ? "공유 동선 불러옴" : "Shared route loaded"}</p>
              {loadedPlanTitle ? <p className="mt-1 text-slate-600">{loadedPlanTitle}</p> : null}
              {loadedPlanDescription ? <p className="mt-1 line-clamp-2 text-slate-500">{loadedPlanDescription}</p> : null}
            </div>
          ) : null}

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`rounded-lg border px-3 py-2 text-xs ${routeMode === "driving" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
              onClick={() => {
                setRouteMode("driving");
                trackClientEvent("route_mode_change", { mode: "driving" });
              }}
            >
              {lang === "ko" ? "차량" : "Driving"}
            </button>
            <button
              type="button"
              className={`rounded-lg border px-3 py-2 text-xs ${routeMode === "walking" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
              onClick={() => {
                setRouteMode("walking");
                trackClientEvent("route_mode_change", { mode: "walking" });
              }}
            >
              {lang === "ko" ? "도보" : "Walking"}
            </button>
          </div>

          <div className="mt-3 grid gap-2">
            <input className="input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={lang === "ko" ? "장소 검색" : "Search place"} />
            <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="all">{lang === "ko" ? "전체 도시" : "All cities"}</option>
              {cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">{lang === "ko" ? "전체 카테고리" : "All categories"}</option>
              {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          {routeSummary ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p>
                {routeSummary.mode === "walking" ? (lang === "ko" ? "도보" : "Walking") : (lang === "ko" ? "차량" : "Driving")} ·{" "}
                {(routeSummary.distanceM / 1000).toFixed(1)}km · {Math.ceil(routeSummary.durationS / 60)}min
              </p>
            </div>
          ) : null}

          {inspectedPlace ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">{localizePlaceName(inspectedPlace, lang)}</p>
              <p className="mt-1 text-xs text-slate-600">{inspectedPlace._city} · {inspectedPlace.category ?? "General"}</p>
              <button className="btn-secondary mt-2 !py-1.5 !text-xs" onClick={() => toggle(inspectedPlace.id)}>
                {selectedIds.includes(inspectedPlace.id) ? (lang === "ko" ? "경로에서 제거" : "Remove from route") : (lang === "ko" ? "경로에 추가" : "Add to route")}
              </button>
            </div>
          ) : null}

          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{lang === "ko" ? "도시별 등록 수" : "By city"}</p>
            <div className="mt-2 grid gap-1 text-xs text-slate-600">
              {cityStats.map(([name, count]) => <p key={name}>{name}: {count}</p>)}
            </div>
          </div>

          <div className="mt-3 max-h-[35vh] space-y-2 overflow-auto pr-1">
            {filtered.map((place) => {
              const idx = selectedIds.indexOf(place.id);
              return (
                <button
                  key={place.id}
                  onClick={() => toggle(place.id)}
                  className={`w-full rounded-xl border p-3 text-left ${idx >= 0 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}
                >
                  <p className="text-sm font-semibold">{localizePlaceName(place, lang)}</p>
                  <p className={`mt-1 text-xs ${idx >= 0 ? "text-slate-200" : "text-slate-500"}`}>
                    {place._city} · {place.category ?? "General"}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedPlaces.length > 0 ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{lang === "ko" ? "선택된 경로" : "Selected route"}</p>
              <ol className="mt-2 space-y-1 text-sm text-slate-700">
                {selectedPlaces.map((p, i) => <li key={p.id}>{i + 1}. {localizePlaceName(p, lang)}</li>)}
              </ol>
              <div className="mt-3 grid gap-2">
                <button className="btn-primary w-full" onClick={() => setRegisterOpen(true)}>
                  {lang === "ko" ? "동선 등록" : "Register route"}
                </button>
                {loadedPlanId ? (
                  <button
                    className="btn-secondary w-full"
                    onClick={() => {
                      setRouteTitle((prev) => prev || loadedPlanTitle || "");
                      setRouteDescription((prev) => prev || loadedPlanDescription || "");
                      setRegisterOpen(true);
                    }}
                  >
                    {lang === "ko" ? "불러온 동선 기반으로 저장" : "Save as new from shared route"}
                  </button>
                ) : null}
                <button className="btn-secondary w-full" onClick={copyShareLink}>
                  {copied ? (lang === "ko" ? "복사 완료" : "Copied") : (lang === "ko" ? "공유 링크 복사" : "Copy share link")}
                </button>
              </div>
              <button className="btn-secondary mt-3 w-full" onClick={() => setSelectedIds([])}>
                {lang === "ko" ? "선택 초기화" : "Clear selection"}
              </button>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {categoryOptions.slice(0, 8).map((item) => (
              <span key={item} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColorMap.get(item ?? "General") ?? "#334155" }} />
                {item ?? "General"}
              </span>
            ))}
          </div>

          {submitResult ? <p className="mt-3 text-xs text-slate-600">{submitResult}</p> : null}
        </aside>
      </div>

      {registerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <form onSubmit={submitRoute} className="panel w-full max-w-lg space-y-3 p-5">
            <h3 className="text-lg font-semibold">{lang === "ko" ? "동선 등록" : "Route registration"}</h3>
            <input className="input" placeholder={lang === "ko" ? "동선 제목" : "Route title"} value={routeTitle} onChange={(e) => setRouteTitle(e.target.value)} required />
            <textarea className="input min-h-20" placeholder={lang === "ko" ? "동선 설명" : "Description"} value={routeDescription} onChange={(e) => setRouteDescription(e.target.value)} />
            <textarea className="input min-h-20" placeholder={lang === "ko" ? "추가 정보" : "Extra info"} value={routeExtraInfo} onChange={(e) => setRouteExtraInfo(e.target.value)} />
            <input className="input" placeholder={lang === "ko" ? "작성자 닉네임 (선택)" : "Nickname (optional)"} value={routeAuthor} onChange={(e) => setRouteAuthor(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary w-full" onClick={() => setRegisterOpen(false)}>
                {lang === "ko" ? "취소" : "Cancel"}
              </button>
              <button type="submit" className="btn-primary w-full" disabled={submitPending}>
                {submitPending ? (lang === "ko" ? "등록 중..." : "Submitting...") : (lang === "ko" ? "동선 등록" : "Submit route")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
