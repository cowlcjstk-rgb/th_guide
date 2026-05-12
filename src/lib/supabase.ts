import { createClient } from "@supabase/supabase-js";
import { mockPlaces } from "@/lib/mock-data";
import { Place } from "@/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseClient() {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export async function getPublishedPlaces(): Promise<Place[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return mockPlaces;

  const { data, error } = await supabase
    .from("places")
    .select("*")
    .eq("is_published", true)
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
