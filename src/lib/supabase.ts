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
