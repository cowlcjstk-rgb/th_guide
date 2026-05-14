import CommunityHub from "@/components/community-hub";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPublishedPlaces } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const places = await getPublishedPlaces();
  const supabase = getSupabaseAdminClient();

  const { data: reviews } = supabase
    ? await supabase.from("place_reviews").select("*").order("created_at", { ascending: false }).limit(120)
    : { data: [] };

  const { data: rawPlans } = supabase
    ? await supabase.from("trip_plans").select("*").order("created_at", { ascending: false }).limit(120)
    : { data: [] };
  const plans = (rawPlans ?? []).filter((plan) => !plan.status || plan.status === "approved");
  const { data: contents } = supabase
    ? await supabase.from("community_contents").select("*").order("section").order("sort_order")
    : { data: [] };

  return <CommunityHub places={places} reviews={reviews ?? []} plans={plans} contents={contents ?? []} section="home" />;
}
