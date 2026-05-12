"use client";

import { useMemo, useState } from "react";
import MapView from "@/components/map-view";
import { useLanguage } from "@/components/language-provider";
import { localizePlaceName } from "@/lib/localize";
import { Place } from "@/lib/types";

export default function MapPlanner({ places }: { places: Place[] }) {
  const { lang } = useLanguage();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return places;
    return places.filter((p) => {
      const name = localizePlaceName(p, lang).toLowerCase();
      return (
        name.includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.district ?? "").toLowerCase().includes(q)
      );
    });
  }, [places, keyword, lang]);

  const selectedPlaces = useMemo(
    () => places.filter((p) => selectedIds.includes(p.id)),
    [places, selectedIds]
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
      <MapView places={places} selectedIds={selectedIds} />
      <aside className="panel p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {lang === "ko" ? "이동 경로 만들기" : "Build route"}
        </h2>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="input mt-3"
          placeholder={lang === "ko" ? "장소 검색" : "Search places"}
        />
        <p className="mt-3 text-xs text-slate-500">
          {lang === "ko"
            ? "장소를 여러 개 선택하면 지도에 순서가 표시됩니다."
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
            <button className="btn-secondary mt-3 w-full" onClick={() => setSelectedIds([])}>
              {lang === "ko" ? "선택 초기화" : "Clear selection"}
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
