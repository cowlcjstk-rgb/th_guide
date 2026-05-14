import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

function parseNumber(value: string | null) {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server env missing" }, { status: 500 });
  }

  const params = req.nextUrl.searchParams;
  const minLng = parseNumber(params.get("minLng"));
  const maxLng = parseNumber(params.get("maxLng"));
  const minLat = parseNumber(params.get("minLat"));
  const maxLat = parseNumber(params.get("maxLat"));
  const city = params.get("city");
  const district = params.get("district");
  const category = params.get("category");
  const keyword = (params.get("q") || "").trim();
  const limit = Math.min(Math.max(Number(params.get("limit") || 1200), 50), 3000);
  const withCluster = params.get("cluster") === "true";
  const zoom = Math.max(0, Math.min(22, Number(params.get("zoom") || 10)));

  if ([minLng, maxLng, minLat, maxLat].some((n) => n == null)) {
    return NextResponse.json({ error: "Bounds are required" }, { status: 400 });
  }

  const runQuery = async (useCityColumn: boolean) => {
    const sb: any = supabase;
    let query = sb
    .from("places")
    .select(
      useCityColumn
        ? "id,name,slug,city,description,address,district,category,tags,latitude,longitude,google_map_url,thumbnail,tips,is_published,is_featured,created_at,updated_at"
        : "id,name,slug,description,address,district,category,tags,latitude,longitude,google_map_url,thumbnail,tips,is_published,is_featured,created_at,updated_at"
    )
    .eq("is_published", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .gte("longitude", minLng as number)
    .lte("longitude", maxLng as number)
    .gte("latitude", minLat as number)
    .lte("latitude", maxLat as number)
    .limit(limit);

    if (useCityColumn && city && city !== "all") query = query.eq("city", city);
    if (district && district !== "all") query = query.eq("district", district);
    if (category && category !== "all") query = query.eq("category", category);
    if (keyword) {
      query = query.or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%`);
    }
    return query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  };

  let { data, error } = await runQuery(true);
  if (error?.message?.includes("column places.city does not exist")) {
    const fallback = await runQuery(false);
    data = fallback.data;
    error = fallback.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const places = data ?? [];

  if (!withCluster) {
    return NextResponse.json({ places });
  }

  const step = zoom <= 6 ? 0.5 : zoom <= 8 ? 0.25 : zoom <= 10 ? 0.12 : zoom <= 12 ? 0.06 : 0.03;
  const buckets = new Map<
    string,
    { count: number; latSum: number; lngSum: number; sampleCategory: string; sampleCity: string }
  >();

  places.forEach((place: Record<string, unknown>) => {
    const lng = Number(place.longitude);
    const lat = Number(place.latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    const gx = Math.floor((lng + 180) / step);
    const gy = Math.floor((lat + 90) / step);
    const key = `${gx}:${gy}`;
    const prev = buckets.get(key);
    if (prev) {
      prev.count += 1;
      prev.latSum += lat;
      prev.lngSum += lng;
      return;
    }
    buckets.set(key, {
      count: 1,
      latSum: lat,
      lngSum: lng,
      sampleCategory: String(place.category ?? "General"),
      sampleCity: String(place.city ?? "Thailand"),
    });
  });

  const clusters = Array.from(buckets.values()).map((bucket) => ({
    count: bucket.count,
    latitude: bucket.latSum / bucket.count,
    longitude: bucket.lngSum / bucket.count,
    category: bucket.sampleCategory,
    city: bucket.sampleCity,
  }));

  return NextResponse.json({ places, clusters, meta: { step, zoom } });
}
