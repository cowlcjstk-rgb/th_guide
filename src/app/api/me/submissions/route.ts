import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/auth-request";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const member = getMemberSession(req);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  let [placesRes, routesRes] = await Promise.all([
    supabase
      .from("places")
      .select("*")
      .eq("submitted_by_member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("trip_plans")
      .select("*")
      .eq("submitted_by_member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (placesRes.error?.message.includes("submitted_by_member_id")) {
    placesRes = await supabase
      .from("places")
      .select("*")
      .eq("submitted_by", member.name)
      .order("created_at", { ascending: false })
      .limit(500);
  }
  if (routesRes.error?.message.includes("submitted_by_member_id")) {
    routesRes = await supabase
      .from("trip_plans")
      .select("*")
      .eq("submitted_by", member.name)
      .order("created_at", { ascending: false })
      .limit(500);
  }

  if (placesRes.error) return NextResponse.json({ error: placesRes.error.message }, { status: 400 });
  if (routesRes.error) return NextResponse.json({ error: routesRes.error.message }, { status: 400 });

  const routePlaceIds = Array.from(
    new Set(
      (routesRes.data ?? [])
        .flatMap((plan) => (Array.isArray(plan.place_ids) ? plan.place_ids : []))
        .filter(Boolean)
        .map(String)
    )
  );

  let routePlaces: Record<string, unknown>[] = [];
  if (routePlaceIds.length > 0) {
    const lookupRes = await supabase
      .from("places")
      .select("id,name,slug,city,category,address,submission_status,is_published,created_at")
      .in("id", routePlaceIds);
    if (!lookupRes.error) routePlaces = lookupRes.data ?? [];
  }

  const mergedPlaces = new Map<string, Record<string, unknown>>();
  (placesRes.data ?? []).forEach((place) => mergedPlaces.set(String(place.id), place));
  routePlaces.forEach((place) => mergedPlaces.set(String(place.id), place));

  return NextResponse.json({
    places: Array.from(mergedPlaces.values()),
    routes: routesRes.data ?? [],
  });
}
