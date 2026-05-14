import { notFound } from "next/navigation";
import CommunityHub from "@/components/community-hub";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPublishedPlaces } from "@/lib/supabase";

const allowed = new Set(["top-rated", "latest-reviews", "route-shares", "guide", "faq"]);

type Props = {
  params: Promise<{ section: string }>;
};

export const dynamic = "force-dynamic";

export default async function CommunitySectionPage({ params }: Props) {
  const { section } = await params;
  if (!allowed.has(section)) notFound();

  const places = await getPublishedPlaces();
  const supabase = getSupabaseAdminClient();

  const { data: reviews } = supabase
    ? await supabase.from("place_reviews").select("*").order("created_at", { ascending: false }).limit(200)
    : { data: [] };

  const { data: rawPlans } = supabase
    ? await supabase.from("trip_plans").select("*").order("created_at", { ascending: false }).limit(200)
    : { data: [] };
  const plans = (rawPlans ?? []).filter((plan) => !plan.status || plan.status === "approved");
  const { data: contents } = supabase
    ? await supabase.from("community_contents").select("*").order("section").order("sort_order")
    : { data: [] };

  return (
    <CommunityHub
      places={places}
      reviews={reviews ?? []}
      plans={plans}
      contents={contents ?? []}
      section={section as "top-rated" | "latest-reviews" | "route-shares" | "guide" | "faq"}
    />
  );
}
