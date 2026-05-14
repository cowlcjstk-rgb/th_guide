import HomeLanding from "@/components/home-landing";
import { getPublishedPlaces, getTopApprovedTripPlans } from "@/lib/supabase";

export const revalidate = 300;

export default async function Home() {
  const places = await getPublishedPlaces({ limit: 500 });
  const topRoutes = await getTopApprovedTripPlans(5);
  const featured = places.filter((item) => item.is_featured).slice(0, 3);
  const latest = places.slice(0, 40);

  return <HomeLanding places={places} featured={featured} latest={latest} topRoutes={topRoutes} />;
}
