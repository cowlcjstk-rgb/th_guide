"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

type SearchResponse = {
  places: Place[];
  page: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
};

const PAGE_SIZE = 120;
const SEARCH_DEBOUNCE_MS = 260;

function sanitizeText(input: string) {
  return input.trim();
}

const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => <div className="panel h-[420px] animate-pulse bg-slate-100" />,
});

export default function PlacesCatalog({ places: initialPlaces, initialCity, initialCategory }: Props) {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const [keyword, setKeyword] = useState(() => searchParams.get("q") ?? "");
  const [city, setCity] = useState(() => initialCity ?? searchParams.get("city") ?? "all");
  const [category, setCategory] = useState(() => initialCategory ?? searchParams.get("category") ?? "all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inspectedPlaceId, setInspectedPlaceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [onlyInViewport, setOnlyInViewport] = useState(false);
  const [viewportBounds, setViewportBounds] = useState<Bounds | null>(null);
  const [boundsPlaces, setBoundsPlaces] = useState<Place[] | null>(null);
  const [boundsClusters, setBoundsClusters] = useState<BoundsCluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(initialPlaces.length);
  const [hasMore, setHasMore] = useState(initialPlaces.length >= PAGE_SIZE);
  const [rows, setRows] = useState<Place[]>(initialPlaces);

  const allKnownPlaces = useMemo(() => {
    const seen = new Set<string>();
    return [...initialPlaces, ...rows].filter((place) => {
      if (seen.has(place.id)) return false;
      seen.add(place.id);
      return true;
    });
  }, [initialPlaces, rows]);

  const withCityOptions = useMemo(
    () => allKnownPlaces.map((p) => ({ ...p, _city: inferThaiCity(p) })),
    [allKnownPlaces]
  );

  const cities = useMemo(() => uniqueValues(withCityOptions.map((p) => p._city)), [withCityOptions]);
  const categories = useMemo(() => uniqueValues(withCityOptions.map((p) => p.category)), [withCityOptions]);

  useEffect(() => {
    if (onlyInViewport) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: sanitizeText(keyword),
          city,
          category,
          limit: String(PAGE_SIZE),
          offset: "0",
        });

        const res = await fetch(`/api/places/search?${params.toString()}`, { signal: controller.signal });
        const data = (await res.json()) as SearchResponse;
        if (!res.ok) return;

        setRows(Array.isArray(data.places) ? data.places : []);
        setTotal(Number(data.page?.total ?? data.places?.length ?? 0));
        setHasMore(Boolean(data.page?.has_more));
      } catch (error) {
        if ((error as { name?: string })?.name !== "AbortError") {
          console.error("places search failed", error);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [keyword, city, category, onlyInViewport]);

  useEffect(() => {
    if (!onlyInViewport || !viewportBounds) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          minLng: String(viewportBounds.minLng),
          minLat: String(viewportBounds.minLat),
          maxLng: String(viewportBounds.maxLng),
          maxLat: String(viewportBounds.maxLat),
          city,
          category,
          q: sanitizeText(keyword),
          limit: "2200",
          cluster: "true",
          zoom: String(Math.round(viewportBounds.zoom)),
        });

        const res = await fetch(`/api/places/bounds?${params.toString()}`, { signal: controller.signal });
        const data = (await res.json()) as { places?: Place[]; clusters?: BoundsCluster[] };
        if (!res.ok) return;

        setBoundsPlaces(Array.isArray(data.places) ? data.places : []);
        setBoundsClusters(Array.isArray(data.clusters) ? data.clusters : []);
      } catch (error) {
        if ((error as { name?: string })?.name !== "AbortError") {
          console.error("places bounds search failed", error);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [onlyInViewport, viewportBounds, city, category, keyword]);

  const filtered = useMemo(() => {
    const source = onlyInViewport ? boundsPlaces ?? [] : rows;
    return source
      .map((item) => ({ ...item, _city: inferThaiCity(item) }))
      .filter((item) => {
        const cityOk = city === "all" || item._city === city;
        const categoryOk = category === "all" || item.category === category;
        return cityOk && categoryOk;
      });
  }, [onlyInViewport, boundsPlaces, rows, city, category]);

  const selectedPlaces = useMemo(() => {
    const rank = new Map(selectedIds.map((id, index) => [id, index]));
    return allKnownPlaces
      .map((p) => ({ ...p, _city: inferThaiCity(p) }))
      .filter((p) => selectedIds.includes(p.id))
      .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  }, [allKnownPlaces, selectedIds]);

  const inspectedPlace = useMemo(
    () => filtered.find((place) => place.id === inspectedPlaceId) ?? null,
    [filtered, inspectedPlaceId]
  );

  const cityStats = useMemo(() => countBy(filtered, (p) => p._city).slice(0, 8), [filtered]);

  const showMap = viewMode !== "list";
  const showList = viewMode !== "map";

  const toggleSelected = (placeId: string) => {
    setSelectedIds((prev) =>
      prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]
    );
  };

  async function loadMore() {
    if (onlyInViewport || !hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        q: sanitizeText(keyword),
        city,
        category,
        limit: String(PAGE_SIZE),
        offset: String(rows.length),
      });

      const res = await fetch(`/api/places/search?${params.toString()}`);
      const data = (await res.json()) as SearchResponse;
      if (!res.ok) return;

      const next = Array.isArray(data.places) ? data.places : [];
      setRows((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...next.filter((p) => !seen.has(p.id))];
      });
      setTotal(Number(data.page?.total ?? total));
      setHasMore(Boolean(data.page?.has_more));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="w-full">
      <div className="panel p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={lang === "ko" ? "장소명, 태그 검색" : "Search by name or tag"}
            className="input"
          />
          <select value={city} onChange={(e) => setCity(e.target.value)} className="input">
            <option value="all">{lang === "ko" ? "전체 도시" : "All cities"}</option>
            {cities.map((item) => (
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
          <button
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              viewMode === "split"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
            onClick={() => setViewMode("split")}
          >
            {lang === "ko" ? "분할 보기" : "Split"}
          </button>
          <button
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              viewMode === "map"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
            onClick={() => setViewMode("map")}
          >
            {lang === "ko" ? "지도만" : "Map only"}
          </button>
          <button
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              viewMode === "list"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
            onClick={() => setViewMode("list")}
          >
            {lang === "ko" ? "리스트만" : "List only"}
          </button>
          <button
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              onlyInViewport
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
            onClick={() => setOnlyInViewport((v) => !v)}
          >
            {lang === "ko" ? "현재 지도 영역만" : "In current map bounds"}
          </button>
          {loading ? (
            <span className="text-xs text-slate-500">{lang === "ko" ? "불러오는 중..." : "Loading..."}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <p className="text-sm text-slate-500">
          {lang === "ko" ? `${filtered.length}개 장소 표시 중` : `Showing ${filtered.length} places`}
        </p>
        <div className="flex flex-wrap gap-2">
          {cityStats.map(([name, count]) => (
            <span key={name} className="chip">
              {name}: {count}
            </span>
          ))}
        </div>
      </div>

      <div className={`mt-4 grid gap-4 ${showMap && showList ? "xl:grid-cols-[1.45fr_1fr]" : "grid-cols-1"}`}>
        {showMap ? (
          <div className="space-y-3">
            <MapView
              places={filtered}
              allPlaces={allKnownPlaces}
              selectedIds={selectedIds}
              focusedPlaceId={inspectedPlaceId}
              onPlaceInspect={setInspectedPlaceId}
              onViewportBoundsChange={setViewportBounds}
              serverClusters={boundsClusters}
              useServerClusters={onlyInViewport}
            />
            {selectedPlaces.length > 0 ? (
              <div className="panel p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {lang === "ko" ? "선택한 장소 카드" : "Selected cards"}
                  </p>
                  <Link href={`/map?plan=${selectedIds.join(",")}`} className="btn-secondary !px-2 !py-1 !text-xs">
                    {lang === "ko" ? "지도 플래너로 보내기" : "Send to planner"}
                  </Link>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {selectedPlaces.map((place, index) => (
                    <div key={place.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-500">#{index + 1}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{localizePlaceName(place, lang)}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {place._city} · {place.category ?? "General"}
                      </p>
                      <button className="btn-secondary mt-2 !px-2 !py-1 !text-xs" onClick={() => toggleSelected(place.id)}>
                        {lang === "ko" ? "제거" : "Remove"}
                      </button>
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
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {lang === "ko" ? "지도에서 선택한 장소" : "Place from map"}
                </h3>
                {inspectedPlace ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-900">{localizePlaceName(inspectedPlace, lang)}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {inspectedPlace._city} · {inspectedPlace.category ?? "General"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{inspectedPlace.address ?? "-"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => toggleSelected(inspectedPlace.id)}>
                        {selectedIds.includes(inspectedPlace.id)
                          ? lang === "ko"
                            ? "선택 해제"
                            : "Unselect"
                          : lang === "ko"
                            ? "카드에 추가"
                            : "Add card"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">
                    {lang === "ko"
                      ? "지도의 핀을 클릭하면 장소 정보가 표시됩니다."
                      : "Click a pin on the map."}
                  </p>
                )}
              </aside>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((place) => (
                <div key={place.id} className="space-y-2">
                  <PlaceCard
                    place={place}
                    disableLink
                    onClick={() => {
                      setInspectedPlaceId(place.id);
                      if (viewMode === "list") setViewMode("split");
                    }}
                  />
                  <button
                    className={`w-full rounded-lg border px-3 py-2 text-xs ${
                      selectedIds.includes(place.id)
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                    onClick={() => toggleSelected(place.id)}
                  >
                    {selectedIds.includes(place.id)
                      ? lang === "ko"
                        ? "선택 해제"
                        : "Unselect"
                      : lang === "ko"
                        ? "선택 카드에 추가"
                        : "Add to selected cards"}
                  </button>
                </div>
              ))}
            </div>

            {!onlyInViewport && hasMore ? (
              <button className="btn-secondary w-full" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (lang === "ko" ? "불러오는 중..." : "Loading...") : lang === "ko" ? "더 불러오기" : "Load more"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
