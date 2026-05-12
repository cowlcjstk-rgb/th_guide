"use client";

import { useMemo, useState } from "react";
import PlaceCard from "@/components/place-card";
import { Place } from "@/lib/types";
import { uniqueValues } from "@/lib/utils";

type Props = {
  places: Place[];
};

export default function PlacesCatalog({ places }: Props) {
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("all");
  const [category, setCategory] = useState("all");

  const districts = useMemo(() => uniqueValues(places.map((p) => p.district)), [places]);
  const categories = useMemo(() => uniqueValues(places.map((p) => p.category)), [places]);

  const filtered = useMemo(() => {
    return places.filter((place) => {
      const q = keyword.trim().toLowerCase();
      const matchesKeyword =
        !q ||
        place.name.toLowerCase().includes(q) ||
        (place.description ?? "").toLowerCase().includes(q) ||
        (place.tags ?? []).join(" ").toLowerCase().includes(q);
      const matchesDistrict = district === "all" || place.district === district;
      const matchesCategory = category === "all" || place.category === category;
      return matchesKeyword && matchesDistrict && matchesCategory;
    });
  }, [places, keyword, district, category]);

  return (
    <section className="w-full">
      <div className="panel p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by name, tag, vibe"
            className="input"
          />
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input">
            <option value="all">All districts</option>
            {districts.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">Showing {filtered.length} places</p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {filtered.map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </div>
    </section>
  );
}
