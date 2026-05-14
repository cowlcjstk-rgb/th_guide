import PlacesCatalog from "@/components/places-catalog";
import { inferThaiCity } from "@/lib/geo";
import { fromFilterSlug, toFilterSlug } from "@/lib/places-seo";
import { getPublishedPlaces } from "@/lib/supabase";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateStaticParams() {
  const places = await getPublishedPlaces();
  const combos = new Set<string>();
  places.forEach((place) => {
    const city = inferThaiCity(place);
    const category = place.category ?? "General";
    combos.add(`${city}||${category}`);
  });
  return Array.from(combos)
    .slice(0, 120)
    .map((item) => {
      const [city, category] = item.split("||");
      return { city: toFilterSlug(city), category: toFilterSlug(category) };
    });
}

export default async function PlacesByCityCategoryPage({
  params,
}: {
  params: Promise<{ city: string; category: string }>;
}) {
  const { city: citySlug, category: categorySlug } = await params;
  const places = await getPublishedPlaces();
  const cityCandidates = Array.from(new Set(places.map((place) => inferThaiCity(place))));
  const city = cityCandidates.find((item) => toFilterSlug(item) === citySlug) ?? fromFilterSlug(citySlug);
  const categoryCandidates = Array.from(
    new Set(
      places
        .filter((place) => inferThaiCity(place) === city)
        .map((place) => place.category ?? "General")
    )
  );
  const category =
    categoryCandidates.find((item) => toFilterSlug(item) === categorySlug) ??
    fromFilterSlug(categorySlug);

  return (
    <div className="w-full space-y-6">
      <section className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          장소 탐색 · {city} · {category}
        </h1>
        <p className="mt-2 text-sm text-slate-600">도시+카테고리 고정 SEO 페이지입니다.</p>
      </section>
      <PlacesCatalog places={places} initialCity={city} initialCategory={category} />
    </div>
  );
}
