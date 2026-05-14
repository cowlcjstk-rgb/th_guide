"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import MapView from "@/components/map-view";
import { useLanguage } from "@/components/language-provider";
import { inferThaiCity, countBy } from "@/lib/geo";
import { localizePlaceName } from "@/lib/localize";
import { buildCategoryColorMap } from "@/lib/map-categories";
import { Place } from "@/lib/types";
import { uniqueValues } from "@/lib/utils";

export default function MapPlanner({ places }: { places: Place[] }) {
  const searchParams = useSearchParams();
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
  const [city, setCity] = useState("all");
  const [district, setDistrict] = useState("all");
  const [category, setCategory] = useState("all");
  const [copied, setCopied] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [submitPending, setSubmitPending] = useState(false);
  const [submitResult, setSubmitResult] = useState("");
  const [routeTitle, setRouteTitle] = useState("");
  const [routeDescription, setRouteDescription] = useState("");
  const [routeExtraInfo, setRouteExtraInfo] = useState("");
  const [routeAuthor, setRouteAuthor] = useState("");
  const [inspectedPlaceId, setInspectedPlaceId] = useState<string | null>(null);

  const withCity = useMemo(
    () => places.map((place) => ({ ...place, _city: inferThaiCity(place) })),
    [places]
  );

  useEffect(() => {
    localStorage.setItem("trip_plan_latest", JSON.stringify(selectedIds));
  }, [selectedIds]);

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (!plan) return;
    const ids = plan.split(",").filter(Boolean);
    if (ids.length === 0) return;
    setSelectedIds(ids);
  }, [searchParams]);

  const cityOptions = useMemo(() => uniqueValues(withCity.map((p) => p._city)), [withCity]);

  const districtOptions = useMemo(() => {
    const scoped = city === "all" ? withCity : withCity.filter((p) => p._city === city);
    return uniqueValues(scoped.map((p) => p.district));
  }, [withCity, city]);

  const categoryOptions = useMemo(() => {
    const scoped = withCity.filter((p) => {
      const cityOk = city === "all" || p._city === city;
      const districtOk = district === "all" || p.district === district;
      return cityOk && districtOk;
    });
    return uniqueValues(scoped.map((p) => p.category));
  }, [withCity, city, district]);

  const categoryColorMap = useMemo(
    () => buildCategoryColorMap(categoryOptions.map((c) => c ?? "General")),
    [categoryOptions]
  );

  const cityStats = useMemo(() => countBy(withCity, (p) => p._city).slice(0, 8), [withCity]);
  const districtStats = useMemo(() => {
    const scoped = city === "all" ? withCity : withCity.filter((p) => p._city === city);
    return countBy(scoped, (p) => p.district ?? "Unknown").slice(0, 8);
  }, [withCity, city]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return withCity.filter((p) => {
      const name = localizePlaceName(p, lang).toLowerCase();
      const cityOk = city === "all" || p._city === city;
      const districtOk = district === "all" || p.district === district;
      const categoryOk = category === "all" || p.category === category;
      const queryOk =
        !q ||
        name.includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.district ?? "").toLowerCase().includes(q) ||
        p._city.toLowerCase().includes(q);
      return cityOk && districtOk && categoryOk && queryOk;
    });
  }, [withCity, keyword, lang, city, district, category]);

  const selectedPlaces = useMemo(() => {
    const order = new Map(selectedIds.map((id, index) => [id, index]));
    return withCity
      .filter((p) => selectedIds.includes(p.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [withCity, selectedIds]);

  const inspectedPlace = useMemo(
    () => withCity.find((p) => p.id === inspectedPlaceId) ?? null,
    [withCity, inspectedPlaceId]
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const copyShareLink = async () => {
    if (selectedIds.length < 2) return;
    const url = new URL(window.location.href);
    url.searchParams.set("plan", selectedIds.join(","));
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submitRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length < 2) return;
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
    const data = await res.json();
    setSubmitPending(false);
    if (!res.ok) {
      setSubmitResult(data?.error ?? "등록 실패");
      return;
    }
    localStorage.setItem("trip_plan_latest", JSON.stringify(selectedIds));
    setSubmitResult(
      lang === "ko"
        ? "동선 등록 요청이 완료되었습니다. 관리자 승인 후 커뮤니티에 공개됩니다."
        : "Route was submitted. It will appear after admin approval."
    );
    setRouteTitle("");
    setRouteDescription("");
    setRouteExtraInfo("");
    setRouteAuthor("");
    setRegisterOpen(false);
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <div className="space-y-3">
          <MapView
            places={filtered}
            allPlaces={withCity}
            selectedIds={selectedIds}
            onPlaceInspect={(placeId) => setInspectedPlaceId(placeId)}
          />
          {selectedPlaces.length > 0 ? (
            <div className="panel p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {lang === "ko" ? "선택한 장소 카드" : "Selected place cards"}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {selectedPlaces.map((place, i) => (
                  <div key={place.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-500">#{i + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{localizePlaceName(place, lang)}</p>
                    <p className="mt-1 text-xs text-slate-600">{place._city} · {place.category ?? "General"}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{place.address ?? "-"}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        className="btn-secondary !px-2 !py-1 !text-xs"
                        onClick={() => toggle(place.id)}
                      >
                        {lang === "ko" ? "제거" : "Remove"}
                      </button>
                      {place.google_map_url ? (
                        <a
                          className="btn-secondary !px-2 !py-1 !text-xs"
                          href={place.google_map_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {lang === "ko" ? "구글맵" : "Google Map"}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
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
            <select
              className="input"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setDistrict("all");
              }}
            >
              <option value="all">{lang === "ko" ? "전체 도시" : "All cities"}</option>
              {cityOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select className="input" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="all">{lang === "ko" ? "전체 지역" : "All districts"}</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">{lang === "ko" ? "전체 카테고리" : "All categories"}</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={`rounded-full border px-2 py-1 text-[11px] ${
                  category === "all" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                {lang === "ko" ? "전체" : "All"}
              </button>
              {categoryOptions.slice(0, 8).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`rounded-full border px-2 py-1 text-[11px] ${
                    category === item ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {inspectedPlace ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {lang === "ko" ? "지도에서 선택한 장소" : "Selected from map"}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{localizePlaceName(inspectedPlace, lang)}</p>
              <p className="mt-1 text-xs text-slate-600">
                {inspectedPlace._city} · {inspectedPlace.district ?? "Unknown"} · {inspectedPlace.category ?? "General"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{inspectedPlace.address ?? "-"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn-secondary !py-1.5 !text-xs" onClick={() => toggle(inspectedPlace.id)}>
                  {selectedIds.includes(inspectedPlace.id)
                    ? lang === "ko"
                      ? "경로에서 제거"
                      : "Remove from route"
                    : lang === "ko"
                      ? "경로에 추가"
                      : "Add to route"}
                </button>
                {inspectedPlace.google_map_url ? (
                  <a
                    className="btn-secondary !py-1.5 !text-xs"
                    href={inspectedPlace.google_map_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {lang === "ko" ? "구글맵 열기" : "Open Google Map"}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {lang === "ko" ? "도시별 등록 수" : "By city"}
              </p>
              <div className="mt-2 grid gap-1 text-xs text-slate-600">
                {cityStats.map(([name, count]) => (
                  <p key={name}>
                    {name}: {count}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {lang === "ko" ? "지역별 등록 수" : "By district"}
              </p>
              <div className="mt-2 grid gap-1 text-xs text-slate-600">
                {districtStats.map(([name, count]) => (
                  <p key={name}>
                    {name}: {count}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {lang === "ko" ? "카테고리 핀 범례" : "Category pin legend"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {categoryOptions.slice(0, 10).map((item) => (
                <span key={item} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColorMap.get(item ?? "General") ?? "#334155" }} />
                  {item ?? "General"}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 max-h-[42vh] space-y-2 overflow-auto pr-1">
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
                    {place._city} · {place.district ?? "Unknown"} · {place.category ?? "General"}
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
                <button className="btn-primary w-full" onClick={() => setRegisterOpen(true)}>
                  {lang === "ko" ? "동선 등록" : "Register route"}
                </button>
                <button className="btn-secondary w-full" onClick={copyShareLink}>
                  {copied ? (lang === "ko" ? "링크 복사 완료" : "Copied") : lang === "ko" ? "링크 복사" : "Copy link"}
                </button>
              </div>
              <button className="btn-secondary mt-3 w-full" onClick={() => setSelectedIds([])}>
                {lang === "ko" ? "선택 초기화" : "Clear selection"}
              </button>
            </div>
          ) : null}

          {submitResult ? <p className="mt-3 text-xs text-slate-600">{submitResult}</p> : null}
        </aside>
      </div>

      {registerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <form onSubmit={submitRoute} className="panel w-full max-w-lg space-y-3 p-5">
            <h3 className="text-lg font-semibold">
              {lang === "ko" ? "동선 등록" : "Route registration"}
            </h3>
            <input
              className="input"
              placeholder={lang === "ko" ? "동선 제목" : "Route title"}
              value={routeTitle}
              onChange={(e) => setRouteTitle(e.target.value)}
              required
            />
            <textarea
              className="input min-h-20"
              placeholder={lang === "ko" ? "동선 설명" : "Description"}
              value={routeDescription}
              onChange={(e) => setRouteDescription(e.target.value)}
            />
            <textarea
              className="input min-h-20"
              placeholder={lang === "ko" ? "추가 정보(시간, 이동수단 등)" : "Extra info (time, transport, notes)"}
              value={routeExtraInfo}
              onChange={(e) => setRouteExtraInfo(e.target.value)}
            />
            <input
              className="input"
              placeholder={lang === "ko" ? "작성자 닉네임(선택)" : "Nickname (optional)"}
              value={routeAuthor}
              onChange={(e) => setRouteAuthor(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary w-full" onClick={() => setRegisterOpen(false)}>
                {lang === "ko" ? "취소" : "Cancel"}
              </button>
              <button type="submit" className="btn-primary w-full" disabled={submitPending}>
                {submitPending ? (lang === "ko" ? "등록 중..." : "Submitting...") : lang === "ko" ? "동선 등록" : "Submit route"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
