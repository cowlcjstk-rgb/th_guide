import { NextRequest, NextResponse } from "next/server";
import { parseAuthToken } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const AUTH_COOKIE = "tg_auth";

function getMemberFromRequest(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const user = parseAuthToken(token);
  if (!user || user.role !== "member") return null;
  return user;
}

export async function GET(req: NextRequest) {
  const member = getMemberFromRequest(req);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const full = req.nextUrl.searchParams.get("full") === "1";

  const { data: rows, error } = await supabase
    .from("member_saved_places")
    .select("place_id,created_at")
    .eq("member_id", member.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    if (error.message.includes("member_saved_places")) {
      return NextResponse.json(
        { error: "member_saved_places table is missing. Run supabase/upgrade_member_saved_places.sql first." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const savedPlaceIds = (rows ?? []).map((item) => String(item.place_id));

  if (!full || savedPlaceIds.length === 0) {
    return NextResponse.json({ saved_place_ids: savedPlaceIds });
  }

  const placesRes = await supabase
    .from("places")
    .select("*")
    .in("id", savedPlaceIds)
    .eq("is_published", true);

  if (placesRes.error) return NextResponse.json({ error: placesRes.error.message }, { status: 400 });

  const placeMap = new Map((placesRes.data ?? []).map((place) => [String(place.id), place]));
  const orderedPlaces = savedPlaceIds.map((id) => placeMap.get(id)).filter(Boolean);

  return NextResponse.json({
    saved_place_ids: savedPlaceIds,
    places: orderedPlaces,
  });
}

export async function POST(req: NextRequest) {
  const member = getMemberFromRequest(req);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as { place_id?: string };
  const placeId = body.place_id?.trim();
  if (!placeId) return NextResponse.json({ error: "place_id is required" }, { status: 400 });

  const { error } = await supabase
    .from("member_saved_places")
    .upsert(
      {
        member_id: member.id,
        place_id: placeId,
      },
      { onConflict: "member_id,place_id", ignoreDuplicates: true }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const member = getMemberFromRequest(req);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as { place_id?: string };
  const placeId = body.place_id?.trim();
  if (!placeId) return NextResponse.json({ error: "place_id is required" }, { status: 400 });

  const { error } = await supabase
    .from("member_saved_places")
    .delete()
    .eq("member_id", member.id)
    .eq("place_id", placeId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
