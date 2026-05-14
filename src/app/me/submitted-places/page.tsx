"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Place } from "@/lib/types";

type ResponseShape = {
  places?: Place[];
  error?: string;
};

export default function MySubmittedPlacesPage() {
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me/submissions", { cache: "no-store" });
      const data = (await res.json()) as ResponseShape;
      if (!res.ok) {
        setError(data.error || "Failed to load.");
        setLoading(false);
        return;
      }
      setPlaces(Array.isArray(data.places) ? data.places : []);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">내 등록 장소</h1>
        <p className="mt-2 text-sm text-slate-600">내 계정으로 등록한 장소와 승인 상태를 확인할 수 있습니다.</p>
      </header>

      <section className="panel p-5">
        {loading ? <p className="text-sm text-slate-600">Loading...</p> : null}
        {!loading && error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {!loading && !error && places.length === 0 ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>아직 등록한 장소가 없습니다.</p>
            <Link href="/submit/place" className="btn-secondary inline-flex">
              장소 등록하러 가기
            </Link>
          </div>
        ) : null}

        {!loading && !error && places.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {places.map((place) => (
              <article key={place.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-base font-semibold text-slate-900">{place.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {(place.city || "Thailand")} · {place.category || "General"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-slate-200 px-2 py-1">
                    상태: {place.submission_status || (place.is_published ? "approved" : "pending")}
                  </span>
                  <span className="rounded-full border border-slate-200 px-2 py-1">
                    등록일: {new Date(place.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                {place.slug ? (
                  <Link href={`/place/${place.slug}`} className="btn-secondary mt-3 inline-flex !text-xs">
                    상세 보기
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}

