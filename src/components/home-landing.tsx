"use client";

import Link from "next/link";
import PlaceCard from "@/components/place-card";
import { useLanguage } from "@/components/language-provider";
import { Place } from "@/lib/types";

type Props = {
  places: Place[];
  featured: Place[];
  latest: Place[];
  topDistricts: string[];
};

export default function HomeLanding({ places, featured, latest, topDistricts }: Props) {
  const { lang } = useLanguage();

  const t =
    lang === "ko"
      ? {
          chip: "방콕 로컬 큐레이션",
          title: "직접 방문 기반 장소 플랫폼",
          desc: "저장하고 싶은 방콕 장소를 빠르게 찾고, 지도 동선까지 바로 만들 수 있습니다.",
          explore: "장소 보기",
          map: "지도 열기",
          focus: "플랫폼 핵심",
          tools: "여행 도구",
          district: "지역별 탐색",
          openCatalog: "전체 카탈로그",
          featured: "추천 장소",
          latest: "최근 추가",
          seeAll: "전체 보기",
          browseCatalog: "리스트 보기",
        }
      : {
          chip: "Bangkok local curation",
          title: "Direct-visit place platform",
          desc: "Find save-worthy Bangkok places and build route plans instantly on map.",
          explore: "Explore places",
          map: "Open map",
          focus: "Platform focus",
          tools: "Travel tools",
          district: "Browse by district",
          openCatalog: "Open full catalog",
          featured: "Featured picks",
          latest: "Latest additions",
          seeAll: "See all",
          browseCatalog: "Browse catalog",
        };

  return (
    <section className="w-full space-y-8">
      <div className="panel overflow-hidden p-7 md:p-10">
        <div className="max-w-3xl">
          <p className="chip">{t.chip}</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
            {t.title}
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600 md:text-base">{t.desc}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/places" className="btn-primary">
              {t.explore}
            </Link>
            <Link href="/map" className="btn-secondary">
              {t.map}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.focus}</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>{lang === "ko" ? "직접 방문 기반 정보" : "Direct-visit based recommendations"}</li>
            <li>{lang === "ko" ? "모바일 우선 UX" : "Fast mobile-first browsing"}</li>
            <li>{lang === "ko" ? "지도 + 태그 탐색" : "Map and tags for discovery"}</li>
          </ul>
        </div>
        <div className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.tools}</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>{lang === "ko" ? "여러 장소 동선 플래너" : "Multi-stop route planner"}</li>
            <li>{lang === "ko" ? "지역/카테고리 필터" : "District/category filters"}</li>
            <li>{lang === "ko" ? `게시 장소 ${places.length}개` : `${places.length} published places`}</li>
          </ul>
        </div>
      </div>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">{t.district}</h2>
          <Link href="/places" className="text-sm text-slate-500 hover:text-slate-900">
            {t.openCatalog}
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {topDistricts.map((d) => (
            <Link key={d} href={`/places?district=${encodeURIComponent(d)}`} className="chip">
              {d}
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold tracking-tight">{t.featured}</h2>
            <Link href="/places" className="text-sm text-slate-500 hover:text-slate-900">
              {t.seeAll}
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">{t.latest}</h2>
          <Link href="/places" className="text-sm text-slate-500 hover:text-slate-900">
            {t.browseCatalog}
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {latest.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      </section>
    </section>
  );
}
