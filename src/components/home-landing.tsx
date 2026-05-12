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

  const districtCount = new Set(places.map((p) => p.district).filter(Boolean)).size;
  const categoryCount = new Set(places.map((p) => p.category).filter(Boolean)).size;

  const t =
    lang === "ko"
      ? {
          chip: "태국 여행 가이드",
          title: "현지감 있는 태국 여행 가이드",
          desc: "실제 방문 기반 장소 데이터와 커뮤니티 리뷰, 이동 경로까지 한 번에 확인할 수 있습니다.",
          explore: "장소 탐색",
          map: "이동 경로 만들기",
          stats: "데이터 현황",
          total: "전체 장소",
          district: "지역 수",
          category: "카테고리 수",
          districtBrowse: "지역별 바로가기",
          openCatalog: "전체 리스트",
          featured: "추천 장소",
          latest: "최신 등록",
          seeAll: "전체 보기",
          browseCatalog: "리스트 이동",
        }
      : {
          chip: "Thailand Travel Guide",
          title: "Practical Thailand travel guide",
          desc: "Explore real-visit places, community reviews, and route planning in one flow.",
          explore: "Explore places",
          map: "Build route",
          stats: "Live data stats",
          total: "Total places",
          district: "Districts",
          category: "Categories",
          districtBrowse: "Quick district access",
          openCatalog: "Open full list",
          featured: "Featured picks",
          latest: "Latest updates",
          seeAll: "See all",
          browseCatalog: "Browse list",
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

      <section className="panel p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.stats}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs text-slate-500">{t.total}</p>
            <p className="mt-1 text-2xl font-semibold">{places.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">{t.district}</p>
            <p className="mt-1 text-2xl font-semibold">{districtCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">{t.category}</p>
            <p className="mt-1 text-2xl font-semibold">{categoryCount}</p>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">{t.districtBrowse}</h2>
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
