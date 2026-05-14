import type { Metadata } from "next";
import PlacesCatalog from "@/components/places-catalog";
import { inferThaiCity } from "@/lib/geo";
import { fromFilterSlug, toFilterSlug } from "@/lib/places-seo";
import { getPublishedPlaces } from "@/lib/supabase";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateStaticParams() {
  const places = await getPublishedPlaces();
  const cities = Array.from(new Set(places.map((place) => inferThaiCity(place))));
  return cities.slice(0, 40).map((city) => ({ city: toFilterSlug(city) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = fromFilterSlug(citySlug);
  const title = `${city} 장소 탐색 | 태국 여행자 커뮤니티`;
  const description = `${city} 지역의 최신 장소 정보를 지도와 카드로 탐색하세요.`;
  const path = `/places/city/${citySlug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function PlacesByCityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: citySlug } = await params;
  const places = await getPublishedPlaces();
  const cityCandidates = Array.from(new Set(places.map((place) => inferThaiCity(place))));
  const city = cityCandidates.find((item) => toFilterSlug(item) === citySlug) ?? fromFilterSlug(citySlug);

  return (
    <div className="w-full space-y-6">
      <section className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">장소 탐색 · {city}</h1>
        <p className="mt-2 text-sm text-slate-600">도시 고정 SEO 페이지입니다.</p>
      </section>
      <PlacesCatalog places={places} initialCity={city} />
    </div>
  );
}
