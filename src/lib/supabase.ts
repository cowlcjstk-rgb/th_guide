import { createClient } from "@supabase/supabase-js";
import { mockPlaces } from "@/lib/mock-data";
import { Place, TravelProduct, TripPlan } from "@/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseClient() {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

type PlaceQueryOptions = {
  city?: string;
  district?: string;
  category?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
};

export async function getPublishedPlaces(options: PlaceQueryOptions = {}): Promise<Place[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return mockPlaces;

  let query = supabase.from("places").select("*").eq("is_published", true);
  if (options.city && options.city !== "all") query = query.eq("city", options.city);
  if (options.district && options.district !== "all") query = query.eq("district", options.district);
  if (options.category && options.category !== "all") query = query.eq("category", options.category);
  if (options.keyword?.trim()) {
    const safe = options.keyword.trim().replaceAll(",", " ").replaceAll("%", "");
    query = query.or(
      `name.ilike.%${safe}%,description.ilike.%${safe}%,address.ilike.%${safe}%,district.ilike.%${safe}%`
    );
  }
  if (options.limit && options.limit > 0) {
    const from = Math.max(0, options.offset ?? 0);
    query = query.range(from, from + options.limit - 1);
  }

  const { data, error } = await query
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) return mockPlaces;
  return data as Place[];
}

export async function getPlaceBySlug(slug: string): Promise<Place | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return mockPlaces.find((p) => p.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("places")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !data) return null;
  return data as Place;
}

export async function getPublishedTravelProducts(): Promise<TravelProduct[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("travel_products")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as TravelProduct[];
}

export async function getTopApprovedTripPlans(limit = 5): Promise<TripPlan[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("trip_plans")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as TripPlan[];
}

export async function getApprovedTripPlanCount(): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("trip_plans")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  if (error) return 0;
  return Number(count ?? 0);
}

export type HomeRecentReview = {
  id: string;
  nickname: string;
  rating: number;
  comment: string | null;
  created_at: string;
  place_id: string;
  place_name: string;
  place_slug: string | null;
};

export async function getRecentHomeReviews(limit = 12): Promise<HomeRecentReview[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("place_reviews")
    .select("id,place_id,nickname,rating,comment,created_at,places(name,slug)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map((row) => {
    const place = (row.places ?? null) as { name?: string; slug?: string } | null;
    return {
      id: String(row.id ?? ""),
      nickname: String(row.nickname ?? "Guest"),
      rating: Number(row.rating ?? 0),
      comment: (row.comment as string | null) ?? null,
      created_at: String(row.created_at ?? ""),
      place_id: String(row.place_id ?? ""),
      place_name: place?.name?.trim() || "Unknown place",
      place_slug: place?.slug?.trim() || null,
    } satisfies HomeRecentReview;
  });
}

export async function getPopularPlaces(limit = 6): Promise<Place[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return mockPlaces.slice(0, limit);

  const [placesRes, reviewsRes] = await Promise.all([
    supabase
      .from("places")
      .select("*")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(700),
    supabase.from("place_reviews").select("place_id,rating,created_at").limit(5000),
  ]);

  const places = (placesRes.data ?? []) as Place[];
  if (places.length === 0) return [];

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const scoreMap = new Map<string, number>();
  const countMap = new Map<string, number>();

  (reviewsRes.data ?? []).forEach((row) => {
    const placeId = String(row.place_id);
    const created = row.created_at ? new Date(row.created_at).getTime() : 0;
    const weight = created >= thirtyDaysAgo ? 1.6 : 1.0;
    const rating = Number(row.rating ?? 0);
    scoreMap.set(placeId, (scoreMap.get(placeId) ?? 0) + rating * weight);
    countMap.set(placeId, (countMap.get(placeId) ?? 0) + 1);
  });

  const ranked = places
    .map((place) => {
      const baseScore = scoreMap.get(place.id) ?? 0;
      const count = countMap.get(place.id) ?? 0;
      const featuredBoost = place.is_featured ? 1.2 : 0;
      const score = baseScore + count * 0.8 + featuredBoost;
      return { place, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.place);

  return ranked;
}
