import type { Metadata } from "next";
import HomeLanding from "@/components/home-landing";
import { getPopularPlaces, getPublishedPlaces, getTopApprovedTripPlans } from "@/lib/supabase";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "태국 여행자 커뮤니티 | 장소·동선·리뷰",
  description: "방콕, 파타야, 치앙마이 최신 장소 정보와 실제 이동 동선을 확인하세요.",
  openGraph: {
    title: "태국 여행자 커뮤니티 | 장소·동선·리뷰",
    description: "방콕, 파타야, 치앙마이 최신 장소 정보와 실제 이동 동선을 확인하세요.",
    type: "website",
  },
};

export default async function Home() {
  const [places, topRoutes, popularPlaces] = await Promise.all([
    getPublishedPlaces({ limit: 500 }),
    getTopApprovedTripPlans(5),
    getPopularPlaces(6),
  ]);
  const featured = places.filter((item) => item.is_featured).slice(0, 3);
  const latest = places.slice(0, 40);

  return <HomeLanding places={places} featured={featured} latest={latest} topRoutes={topRoutes} popularPlaces={popularPlaces} />;
}
