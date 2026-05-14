"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import MapView from "@/components/map-view";
import PlaceCard from "@/components/place-card";
import { useLanguage } from "@/components/language-provider";
import { countBy, inferThaiCity } from "@/lib/geo";
import { localizePlaceName } from "@/lib/localize";
import { Place } from "@/lib/types";
import { uniqueValues } from "@/lib/utils";

type Props = {
  places: Place[];
  initialCity?: string;
  initialCategory?: string;
};

type ViewMode = "split" | "map" | "list";

type Bounds = { minLng: number; minLat: number; maxLng: number; maxLat: number; zoom: number };
type BoundsCluster = { count: number; latitude: number; longitude: number; category: string; city: string };

export default function PlacesCatalog({ places, initialCity, initialCategory }: Props) {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const [keyword, setKeyword] = useState(() => searchParams.get("q") ?? "");
  const [city, setCity] = useState(() => initialCity ?? searchParams.get("city") ?? "all");
  const [district, setDistrict] = useState(() => searchParams.get("district") ?? "all");
  const [category, setCategory] = useState(() => initialCategory ?? searchParams.get("category") ?? "all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inspectedPlaceId, setInspectedPlaceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [onlyInViewport, setOnlyInViewport] = useState(false);
  const [viewportPlaceIds, setViewportPlaceIds] = useState<string[]>([]);
  const [viewportBounds, setViewportBounds] = useState<Bounds | null>(null);
  const [boundsPlaces, setBoundsPlaces] = useState<Place[] | null>(null);
  const [boundsClusters, setBoundsClusters] = useState<BoundsCluster[]>([]);
  const [boundsLoading, setBoundsLoading] = useState(false);

  const withCity = useMemo(() => places.map((p) => ({ ...p, _city: inferThaiCity(p) })), [places]);
  const cities = useMemo(() => uniqueValues(withCity.map((p) => p._city)), [withCity]);

  const districts = useMemo(() => {
    const scoped = city === "all" ? withCity : withCity.filter((p) => p._city === city);
    return uniqueValues(scoped.map((p) => p.district));
  }, [withCity, city]);

  const categories = useMemo(() => {
    const scoped = withCity.filter((p) => {
      const cityOk = city === "all" || p._city === city;
      const districtOk = district === "all" || p.district === district;
      return cityOk && districtOk;
    });
    return uniqueValues(scoped.map((p) => p.category));
  }, [withCity, city, district]);

  const baseFiltered = useMemo(() => {
    return withCity.filter((place) => {
      const q = keyword.trim().toLowerCase();
      const matchesKeyword =
        !q ||
        place.name.toLowerCase().includes(q) ||
        (place.description ?? "").toLowerCase().includes(q) ||
        (place.tags ?? []).join(" ").toLowerCase().includes(q);
      const matchesCity = city === "all" || place._city === city;
      const matchesDistrict = district === "all" || place.district === district;
      const matchesCategory = category === "all" || place.category === category;
      return matchesKeyword && matchesCity && matchesDistrict && matchesCategory;
    });
  }, [withCity, keyword, city, district, category]);

  useEffect(() => {
    if (!onlyInViewport || !viewportBounds) {
      setBoundsPlaces(null);
      setBoundsClusters([]);
      return;
    }

    const timer = setTimeout(async () => {
      setBoundsLoading(true);
      try {
        const params = new URLSearchParams({
          minLng: String(viewportBounds.minLng),
          minLat: String(viewportBounds.minLat),
          maxLng: String(viewportBounds.maxLng),
          maxLat: String(viewportBounds.maxLat),
          city,
          district,
          category,
          q: keyword,
          limit: "2000",
          cluster: "true",
          zoom: String(Math.round(viewportBounds.zoom)),
        });
        const res = await fetch(`/api/places/bounds?${params.toString()}`);
        const data = (await res.json()) as { places?: Place[]; clusters?: BoundsCluster[] };
        if (res.ok) {
          setBoundsPlaces(Array.isArray(data.places) ? data.places : []);
          setBoundsClusters(Array.isArray(data.clusters) ? data.clusters : []);
        }
      } finally {
        setBoundsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [onlyInViewport, viewportBounds, city, district, category, keyword]);

  const filtered = useMemo(() => {
    if (!onlyInViewport) return baseFiltered;

    if (boundsPlaces) {
      const rows = boundsPlaces.map((p) => ({ ...p, _city: inferThaiCity(p) }));
      return rows.filter((place) => {
        const q = keyword.trim().toLowerCase();
        const matchesKeyword =
          !q ||
          place.name.toLowerCase().includes(q) ||
          (place.description ?? "").toLowerCase().includes(q) ||
          (place.tags ?? []).join(" ").toLowerCase().includes(q);
        const matchesCity = city === "all" || place._city === city;
        const matchesDistrict = district === "all" || place.district === district;
        const matchesCategory = category === "all" || place.category === category;
        return matchesKeyword && matchesCity && matchesDistrict && matchesCategory;
      });
    }

    const visible = new Set(viewportPlaceIds);
    return baseFiltered.filter((place) => visible.has(place.id));
  }, [onlyInViewport, boundsPlaces, baseFiltered, viewportPlaceIds, keyword, city, district, category]);

  const inspectedPlace = useMemo(
    () => filtered.find((place) => place.id === inspectedPlaceId) ?? null,
    [filtered, inspectedPlaceId]
  );

  const selectedPlaces = useMemo(() => {
    const rank = new Map(selectedIds.map((id, index) => [id, index]));
    return withCity
      .filter((p) => selectedIds.includes(p.id))
      .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  }, [withCity, selectedIds]);

  const cityStats = useMemo(() => countBy(withCity, (p) => p._city).slice(0, 8), [withCity]);

  const toggleSelected = (placeId: string) => {
    setSelectedIds((prev) =>
      prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]
    );
  };

  const moveSelected = (placeId: string, dir: "up" | "down") => {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(placeId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const showMap = viewMode !== "list";
  const showList = viewMode !== "map";

  return (
    <section className="w-full">
      <div className="panel p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={lang === "ko" ? "장소명, 태그 검색" : "Search by name or tag"}
            className="input"
          />
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setDistrict("all");
            }}
            className="input"
          >
            <option value="all">{lang === "ko" ? "전체 도시" : "All cities"}</option>
            {cities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input">
            <option value="all">{lang === "ko" ? "전체 지역" : "All districts"}</option>
            {districts.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            <option value="all">{lang === "ko" ? "전체 카테고리" : "All categories"}</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className={`rounded-lg border px-3 py-1.5 text-xs ${viewMode === "split" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`} onClick={() => setViewMode("split")}>{lang === "ko" ? "분할 보기" : "Split"}</button>
          <button className={`rounded-lg border px-3 py-1.5 text-xs ${viewMode === "map" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`} onClick={() => setViewMode("map")}>{lang === "ko" ? "지도만" : "Map only"}</button>
          <button className={`rounded-lg border px-3 py-1.5 text-xs ${viewMode === "list" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`} onClick={() => setViewMode("list")}>{lang === "ko" ? "리스트만" : "List only"}</button>
          <button className={`rounded-lg border px-3 py-1.5 text-xs ${onlyInViewport ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`} onClick={() => setOnlyInViewport((v) => !v)}>{lang === "ko" ? "현재 지도 영역만" : "In current map bounds"}</button>
          {boundsLoading ? <span className="text-xs text-slate-500">{lang === "ko" ? "영역 데이터 불러오는 중..." : "Loading bounds data..."}</span> : null}
          {onlyInViewport && boundsClusters.length > 0 ? (
            <span className="text-xs text-slate-500">
              {lang === "ko"
                ? `서버 클러스터 ${boundsClusters.length}개`
                : `Server clusters ${boundsClusters.length}`}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <p className="text-sm text-slate-500">{lang === "ko" ? `${filtered.length}개 장소 표시 중` : `Showing ${filtered.length} places`}</p>
        <div className="flex flex-wrap gap-2">
          {cityStats.map(([name, count]) => (
            <span key={name} className="chip">{name}: {count}</span>
          ))}
        </div>
      </div>

      <div className={`mt-4 grid gap-4 ${showMap && showList ? "xl:grid-cols-[1.45fr_1fr]" : "grid-cols-1"}`}>
        {showMap ? (
          <div className="space-y-3">
            <MapView
              places={baseFiltered}
              allPlaces={withCity}
              selectedIds={selectedIds}
              onPlaceInspect={setInspectedPlaceId}
              onViewportPlaceIdsChange={setViewportPlaceIds}
              onViewportBoundsChange={setViewportBounds}
              serverClusters={boundsClusters}
              useServerClusters={onlyInViewport}
            />
            {selectedPlaces.length > 0 ? (
              <div className="panel p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{lang === "ko" ? "선택한 장소 카드" : "Selected place cards"}</p>
                  <Link href={`/map?plan=${selectedIds.join(",")}`} className="btn-secondary !px-2 !py-1 !text-xs">{lang === "ko" ? "지도 플래너로 보내기" : "Send to planner"}</Link>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {selectedPlaces.map((place, index) => (
                    <div key={place.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-500">#{index + 1}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{localizePlaceName(place, lang)}</p>
                      <p className="mt-1 text-xs text-slate-600">{place._city} · {place.category ?? "General"}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{place.address ?? "-"}</p>
                      <div className="mt-2 flex gap-2">
                        <button className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => moveSelected(place.id, "up")}>↑</button>
                        <button className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => moveSelected(place.id, "down")}>↓</button>
                        <button className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => toggleSelected(place.id)}>{lang === "ko" ? "제거" : "Remove"}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {showList ? (
          <div className="space-y-4">
            {showMap ? (
              <aside className="panel p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{lang === "ko" ? "지도에서 선택한 장소" : "Place from map"}</h3>
                {inspectedPlace ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-900">{localizePlaceName(inspectedPlace, lang)}</p>
                    <p className="mt-1 text-xs text-slate-600">{inspectedPlace._city} · {inspectedPlace.district ?? "Unknown"} · {inspectedPlace.category ?? "General"}</p>
                    <p className="mt-1 text-xs text-slate-500">{inspectedPlace.address ?? "-"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => toggleSelected(inspectedPlace.id)}>
                        {selectedIds.includes(inspectedPlace.id) ? (lang === "ko" ? "선택 해제" : "Unselect") : (lang === "ko" ? "카드에 추가" : "Add card")}
                      </button>
                      {inspectedPlace.google_map_url ? <a className="btn-secondary !px-2 !py-1 !text-xs" href={inspectedPlace.google_map_url} target="_blank" rel="noreferrer">{lang === "ko" ? "구글맵 열기" : "Open Google Map"}</a> : null}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">{lang === "ko" ? "지도의 핀을 클릭하면 장소 정보가 표시됩니다." : "Click a pin on the map to view place details."}</p>
                )}
              </aside>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((place) => (
                <div key={place.id} className="space-y-2">
                  <PlaceCard place={place} />
                  <button className={`w-full rounded-lg border px-3 py-2 text-xs ${selectedIds.includes(place.id) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`} onClick={() => toggleSelected(place.id)}>
                    {selectedIds.includes(place.id) ? (lang === "ko" ? "선택 해제" : "Unselect") : (lang === "ko" ? "선택 카드에 추가" : "Add to selected cards")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
