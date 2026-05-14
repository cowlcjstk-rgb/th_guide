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
