import HomeLanding from "@/components/home-landing";
import { getPublishedPlaces } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const places = await getPublishedPlaces();
  const featured = places.filter((item) => item.is_featured).slice(0, 3);
  const latest = places.slice(0, 4);
  const topDistricts = Array.from(
    new Set(places.map((p) => p.district).filter(Boolean) as string[])
  ).slice(0, 8);

  return <HomeLanding places={places} featured={featured} latest={latest} topDistricts={topDistricts} />;
}
